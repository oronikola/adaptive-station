<?php

namespace App\Console\Commands;

use App\Models\TapEvent;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Console\Command;

/**
 * One-time correction tool for tap_events rows recorded before the
 * server-side direction fix (see TapEvent::resolveEventType()) — until then,
 * event_type was whatever the tapping kiosk's own per-device cache guessed,
 * which could produce runs of consecutive IN (or OUT) events for the same
 * person. Replays each person's tap history in chronological order and
 * rewrites event_type using the same day-boundary toggle rule the live path
 * now uses (TapEvent::nextEventType()), so historical rows end up matching
 * what the fixed logic would have produced.
 */
class BackfillTapEventDirectionCommand extends Command
{
    protected $signature = 'tap-events:backfill-direction
        {--tenant= : Only recompute this tenant\'s tap_events, by tenant code; omit to process every tenant}
        {--dry-run : Report how many rows would change without writing anything}';

    protected $description = 'Recompute tap_events.event_type in chronological order per person, correcting rows recorded before the direction fix';

    public function handle(): int
    {
        $code = $this->option('tenant');
        $dryRun = (bool) $this->option('dry-run');

        $tenants = $code !== null ? Tenant::where('code', $code)->get() : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error($code !== null ? "No tenant found with code [{$code}]." : 'No tenants exist yet.');

            return self::FAILURE;
        }

        $totalChanged = 0;

        foreach ($tenants as $tenant) {
            TenantDatabase::use($tenant);

            $personIds = TapEvent::allTenants()->whereNotNull('person_id')->distinct()->pluck('person_id');
            $tenantChanged = 0;

            foreach ($personIds as $personId) {
                $tenantChanged += $this->correctPersonHistory($personId, $dryRun);
            }

            $this->info("[{$tenant->code}] {$personIds->count()} people checked, {$tenantChanged} row(s) ".($dryRun ? 'would change' : 'corrected').'.');
            $totalChanged += $tenantChanged;
        }

        $this->info(($dryRun ? '[dry run] ' : '')."Done — {$totalChanged} tap_events row(s) ".($dryRun ? 'would be corrected' : 'corrected').' in total.');

        return self::SUCCESS;
    }

    protected function correctPersonHistory(string $personId, bool $dryRun): int
    {
        $events = TapEvent::allTenants()
            ->where('person_id', $personId)
            ->orderBy('occurred_at')
            ->orderBy('received_at')
            ->get(['id', 'event_type', 'occurred_at', 'attendance_date_local']);

        $lastDate = null;
        $lastType = null;
        $changed = 0;

        foreach ($events as $event) {
            $currentDate = $event->attendance_date_local->toDateString();
            $corrected = TapEvent::nextEventType($lastDate, $lastType, $currentDate);

            if ($corrected !== $event->event_type) {
                $changed++;

                if (! $dryRun) {
                    $event->forceFill(['event_type' => $corrected])->save();
                }
            }

            $lastDate = $currentDate;
            $lastType = $corrected;
        }

        return $changed;
    }
}
