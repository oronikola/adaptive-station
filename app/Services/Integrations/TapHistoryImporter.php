<?php

namespace App\Services\Integrations;

use App\Enums\ImportExceptionType;
use App\Enums\PersonType;
use App\Enums\TapEventType;
use App\Models\ImportBatch;
use App\Models\ImportException;
use App\Models\Person;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Imports taphistory rows into tap_events, applying the documented 3-step
 * matching order (stable ID -> insert-or-duplicate -> import_exceptions) so
 * every row is counted exactly once (RosterImporter::emptyCounters shape).
 */
class TapHistoryImporter
{
    public const SOURCE_SYSTEM = 'legacy_mysql';

    protected array $stationCache = [];

    public function __construct(
        protected LegacyMysqlConnector $connector,
        protected ImportBatch $batch,
        protected bool $commit,
        protected ?User $actor = null,
    ) {
    }

    public function run(Carbon $from, Carbon $to): array
    {
        $counters = RosterImporter::emptyCounters();
        $tenantId = $this->batch->tenant_id;
        $tenant = Tenant::findOrFail($tenantId);

        foreach ($this->connector->fetchTapHistory($from, $to) as $row) {
            $counters['source']++;

            $existing = \App\Models\TapEvent::allTenants()
                ->where('tenant_id', $tenantId)
                ->where('source_system', static::SOURCE_SYSTEM)
                ->where('source_record_id', $row['source_record_id'])
                ->exists();

            if ($existing) {
                $counters['skipped_known']++;

                continue;
            }

            $occurredAt = $this->parseOccurredAt($row, $tenant->timezone);
            if ($occurredAt === null) {
                $counters['rejected']++;
                $this->recordException($row['source_record_id'] ?? null, ImportExceptionType::ValidationError, $row);

                continue;
            }

            $eventType = $this->mapTapState($row['tapstate']);
            if ($eventType === null) {
                $counters['rejected']++;
                $this->recordException($row['source_record_id'] ?? null, ImportExceptionType::UnsupportedData, $row);

                continue;
            }

            $person = Person::allTenants()
                ->where('tenant_id', $tenantId)
                ->where('source_system', static::SOURCE_SYSTEM)
                ->where('source_record_id', $row['studid'])
                ->first();

            if ($person === null) {
                $counters['manual_review']++;
                $this->recordException($row['source_record_id'] ?? null, ImportExceptionType::MissingReference, $row);

                continue;
            }

            if (! $this->commit) {
                $counters['imported']++;

                continue;
            }

            $station = $this->resolveStation($tenantId, $row['legacy_station_id']);
            $personType = match ($row['utype']) {
                1 => PersonType::Staff,
                7 => PersonType::Student,
                default => $person->person_type,
            };

            $inserted = \App\Models\TapEvent::importOne($tenantId, [
                'station_id' => $station->id,
                'person_id' => $person->id,
                'card_uid' => $person->rfidCards()->where('is_active', true)->value('card_uid') ?? 'UNKNOWN',
                'person_type' => $personType,
                'event_type' => $eventType,
                'occurred_at' => $occurredAt->clone()->utc(),
                'occurred_offset_minutes' => $occurredAt->clone()->setTimezone($tenant->timezone)->utcOffset(),
                'received_at' => $row['createddatetime'] !== null ? Carbon::parse($row['createddatetime']) : Carbon::now(),
                'attendance_date_local' => $occurredAt->clone()->setTimezone($tenant->timezone)->toDateString(),
                'source_system' => static::SOURCE_SYSTEM,
                'source_record_id' => $row['source_record_id'],
                'import_batch_id' => $this->batch->id,
                'metadata' => ['legacy_mode' => $row['mode'], 'legacy_tapstatus' => $row['tapstatus']],
            ]);

            $counters[$inserted ? 'imported' : 'skipped_known']++;
        }

        return $counters;
    }

    /**
     * tdate/ttime are the legacy app's recorded local wall-clock time (per
     * LEGACY_FIELD_MAPPING.md), not UTC — must be parsed in the tenant's
     * timezone before converting to UTC for storage, or the imported
     * occurred_at silently drifts by the tenant's UTC offset.
     */
    protected function parseOccurredAt(array $row, string $tenantTimezone): ?Carbon
    {
        try {
            return Carbon::parse("{$row['tdate']} {$row['ttime']}", $tenantTimezone);
        } catch (\Throwable) {
            return null;
        }
    }

    protected function mapTapState(mixed $tapstate): ?TapEventType
    {
        $value = strtoupper((string) $tapstate);

        return match (true) {
            in_array($value, ['1', 'IN'], true) => TapEventType::In,
            in_array($value, ['0', 'OUT'], true) => TapEventType::Out,
            default => null,
        };
    }

    protected function resolveStation(string $tenantId, string $legacyStationId): Station
    {
        if (isset($this->stationCache[$legacyStationId])) {
            return $this->stationCache[$legacyStationId];
        }

        $station = Station::allTenants()
            ->where('tenant_id', $tenantId)
            ->where('legacy_station_id', $legacyStationId)
            ->first();

        $station ??= Station::registerLegacyPlaceholder($tenantId, $legacyStationId, $this->actor);

        return $this->stationCache[$legacyStationId] = $station;
    }

    protected function recordException(?string $sourceRecordId, ImportExceptionType $type, array $payload): void
    {
        if (! $this->commit) {
            return;
        }

        ImportException::record($this->batch->tenant_id, $this->batch->id, 'tap_event', $sourceRecordId, $type, $payload);
    }
}
