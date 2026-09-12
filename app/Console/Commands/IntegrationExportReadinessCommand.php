<?php

namespace App\Console\Commands;

use App\Models\Person;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Date;

/**
 * A self-contained audit of THIS system's own data — it never connects to
 * the legacy database, and answers a narrower question than "will the
 * export succeed": does every tap event in the window have a person and
 * station carrying the legacy identity fields (Person::source_record_id/
 * external_id, Station::legacy_station_id) that RunLegacyExportJob::mapRow()
 * needs to produce a valid studid/station_id? A row missing either either
 * exports as an orphan legacy row (unmatched studid) or, for a station with
 * no legacy_station_id and no station_code either, as the literal string
 * 'UNKNOWN' — which throws outright against an integer legacy column.
 *
 * Deliberately does not check the tapstate encoding convention (see
 * LEGACY_FIELD_MAPPING.md) — that requires a real sample from the legacy
 * database itself, which this command has no way to reach.
 */
class IntegrationExportReadinessCommand extends Command
{
    protected $signature = 'integrations:export-readiness
        {--tenant= : Tenant code to check; omit to check every tenant}
        {--from= : Start of the date range (Y-m-d), inclusive. Defaults to 30 days ago.}
        {--to= : End of the date range (Y-m-d), inclusive. Defaults to today.}';

    protected $description = 'Report tap events in a date range whose person/station is missing the legacy IDs a taphistory export needs';

    public function handle(): int
    {
        $from = $this->option('from') ?? Date::now()->subDays(30)->toDateString();
        $to = $this->option('to') ?? Date::now()->toDateString();

        $tenants = $this->option('tenant')
            ? Tenant::where('code', $this->option('tenant'))->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('No matching tenant found.');

            return self::FAILURE;
        }

        $anyIssues = false;

        foreach ($tenants as $tenant) {
            TenantDatabase::use($tenant);

            if ($this->reportForTenant($tenant, $from, $to)) {
                $anyIssues = true;
            }
        }

        return $anyIssues ? self::FAILURE : self::SUCCESS;
    }

    protected function reportForTenant(Tenant $tenant, string $from, string $to): bool
    {
        $events = TapEvent::allTenants()->search(['date_from' => $from, 'date_to' => $to]);
        $totalCount = (clone $events)->count();

        $this->newLine();
        $this->line("<fg=cyan>School: {$tenant->name} (tenant: {$tenant->code})</>");
        $this->line("  Date range: {$from} to {$to}");
        $this->line("  Tap events in range: {$totalCount}");

        if ($totalCount === 0) {
            return false;
        }

        $unmatchedCount = (clone $events)->whereNull('person_id')->count();

        // withTrashed(): a tap event can reference a person who was later
        // soft-deleted — their historical taps still need a valid studid.
        $badPersonIds = Person::allTenants()->withTrashed()
            ->whereNull('source_record_id')->whereNull('external_id')
            ->pluck('id');
        $badPersonEventCount = $badPersonIds->isEmpty() ? 0
            : (clone $events)->whereIn('person_id', $badPersonIds)->count();

        $badStationIds = Station::allTenants()
            ->whereNull('legacy_station_id')
            ->pluck('id');
        $badStationEventCount = $badStationIds->isEmpty() ? 0
            : (clone $events)->whereIn('station_id', $badStationIds)->count();

        $hasIssues = $unmatchedCount > 0 || $badPersonEventCount > 0 || $badStationEventCount > 0;

        if ($unmatchedCount > 0) {
            $this->warn("  ⚠ {$unmatchedCount} tap event(s) have no matched person at all (card never resolved) — cannot export a studid for these.");
        }

        if ($badPersonEventCount > 0) {
            $affectedPersonIds = (clone $events)->whereIn('person_id', $badPersonIds)
                ->distinct()->pluck('person_id');
            $affected = Person::allTenants()->withTrashed()->whereIn('id', $affectedPersonIds)
                ->get(['id', 'display_name']);

            $this->warn("  ⚠ {$badPersonEventCount} tap event(s) belong to a person with no legacy student ID (source_record_id/external_id) — their studid would be this system's own internal id:");
            foreach ($affected as $person) {
                $this->line("      - {$person->display_name} (person_id: {$person->id})");
            }
        }

        if ($badStationEventCount > 0) {
            $affectedStationIds = (clone $events)->whereIn('station_id', $badStationIds)
                ->distinct()->pluck('station_id');
            $affected = Station::allTenants()->whereIn('id', $affectedStationIds)
                ->get(['id', 'name', 'station_code']);

            $this->warn("  ⚠ {$badStationEventCount} tap event(s) belong to a station with no legacy_station_id — its taphistory station_id would fall back to its own station_code, or the literal string 'UNKNOWN' if that's blank too:");
            foreach ($affected as $station) {
                $fallback = $station->station_code ?: "'UNKNOWN'";
                $this->line("      - {$station->name} (station_id: {$station->id}) — would export as: {$fallback}");
            }
        }

        // Counted separately above per category (for the per-category
        // messages), but a single tap event can fall into more than one
        // category at once — summing those counts would double-subtract the
        // overlap. This re-queries for the union so "export-safe" is
        // accurate rather than an undercount that can go negative.
        $badEventCount = (clone $events)->where(function ($query) use ($badPersonIds, $badStationIds) {
            $query->whereNull('person_id');
            if ($badPersonIds->isNotEmpty()) {
                $query->orWhereIn('person_id', $badPersonIds);
            }
            if ($badStationIds->isNotEmpty()) {
                $query->orWhereIn('station_id', $badStationIds);
            }
        })->count();
        $exportSafe = $totalCount - $badEventCount;

        if (! $hasIssues) {
            $this->info("  ✅ All {$totalCount} tap events are export-safe.");
        } else {
            $this->line("  {$exportSafe} of {$totalCount} tap events are export-safe.");
        }

        return $hasIssues;
    }
}
