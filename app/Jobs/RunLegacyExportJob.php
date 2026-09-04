<?php

namespace App\Jobs;

use App\Enums\IntegrationRunStatus;
use App\Models\IntegrationProfile;
use App\Models\IntegrationRun;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Services\Integrations\LegacyMysqlConnector;
use App\Support\TenantDatabase;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * One-way export: Adaptive Station tap_events -> legacy taphistory format,
 * for an operator-chosen date range (tap_events carries no "already
 * exported" flag — it is immutable and never mutated after insertion — so
 * safety on re-run comes entirely from the legacy-side dedup check inside
 * LegacyMysqlConnector::insertTapHistoryIfMissing()).
 */
class RunLegacyExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Bounded retry — safe because insertTapHistoryIfMissing() re-checks the
     * legacy dedup key before every insert, so a retried run after a crash
     * mid-export cannot double-write (proved by LegacyExportJobTest's re-run
     * assertions).
     */
    public $tries = 3;

    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function __construct(
        protected string $integrationRunId,
        protected string $tenantId,
        protected string $dateFrom,
        protected string $dateTo,
    ) {}

    public function handle(): void
    {
        TenantDatabase::use(Tenant::findOrFail($this->tenantId));

        $run = IntegrationRun::allTenants()->findOrFail($this->integrationRunId);
        $profile = IntegrationProfile::allTenants()->findOrFail($run->integration_profile_id);
        $connector = LegacyMysqlConnector::forProfile($profile);

        $exported = 0;
        $alreadyPresent = 0;

        TapEvent::allTenants()
            ->where('tenant_id', $this->tenantId)
            ->search(['date_from' => $this->dateFrom, 'date_to' => $this->dateTo])
            ->with(['station', 'person'])
            ->chunkById(200, function ($events) use ($connector, &$exported, &$alreadyPresent) {
                foreach ($events as $event) {
                    if ($connector->insertTapHistoryIfMissing($this->mapRow($event))) {
                        $exported++;
                    } else {
                        $alreadyPresent++;
                    }
                }
            }, 'id');

        $run->finish(IntegrationRunStatus::Succeeded, ['exported' => $exported, 'already_present' => $alreadyPresent]);
    }

    protected function mapRow(TapEvent $event): array
    {
        $localAt = $event->occurred_at->clone()->addMinutes($event->occurred_offset_minutes);

        return [
            'legacy_station_id' => $event->station?->legacy_station_id ?? $event->station?->station_code ?? 'UNKNOWN',
            'tdate' => $localAt->toDateString(),
            'ttime' => $localAt->format('H:i:s'),
            'tapstate' => $event->event_type->value === 'IN' ? '1' : '0',
            'studid' => $event->person?->source_record_id ?? $event->person?->external_id ?? (string) $event->person_id,
            'utype' => $event->person_type?->value === 'staff' ? 1 : 7,
            'mode' => $event->metadata['legacy_mode'] ?? 'rfid',
            'tapstatus' => $event->metadata['legacy_tapstatus'] ?? null,
            'createddatetime' => $event->received_at->toDateTimeString(),
        ];
    }
}
