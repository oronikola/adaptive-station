<?php

namespace App\Jobs;

use App\Enums\IntegrationDirection;
use App\Enums\IntegrationProfileStatus;
use App\Models\IntegrationProfile;
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
 * The real-time counterpart to RunLegacyExportJob's batch/on-demand export —
 * fired once per accepted tap (see TapEvent::acceptBatch()) instead of over
 * an operator-chosen date range, for a school that's meant to keep its
 * legacy system's own attendance data live rather than only synced in
 * batches. A tenant with no enabled export-capable IntegrationProfile is a
 * silent no-op — this only ever applies to a school that opted in, and
 * every other tenant's tap flow is completely unaffected by this job even
 * existing.
 *
 * Same dedup guarantee as the batch path: insertTapHistoryIfMissing() checks
 * the legacy table itself before inserting, so if both this job and a batch
 * export ever raced over the same tap, neither could double-write it.
 */
class PushTapEventToLegacyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Bounded retry, same reasoning as RunLegacyExportJob — a legacy
     * connection that's down for longer than this backoff window will
     * simply miss this one tap's real-time push; the next scheduled batch
     * export (if one exists) is the backstop, not infinite retries here.
     */
    public $tries = 3;

    public function backoff(): array
    {
        return [30, 120, 300];
    }

    public function __construct(
        protected string $tenantId,
        protected string $tapEventId,
    ) {}

    public function handle(): void
    {
        TenantDatabase::use(Tenant::findOrFail($this->tenantId));

        $profile = IntegrationProfile::allTenants()
            ->where('tenant_id', $this->tenantId)
            ->where('status', IntegrationProfileStatus::Active)
            ->whereIn('direction', [IntegrationDirection::ExportOnly, IntegrationDirection::Bidirectional])
            ->first();

        // No opted-in legacy connection for this school — nothing to do.
        // This is the expected, common case for every tenant that never
        // asked for real-time legacy sync.
        if ($profile === null) {
            return;
        }

        $event = TapEvent::allTenants()->with(['station', 'person'])->find($this->tapEventId);
        if ($event === null) {
            return;
        }

        $connector = LegacyMysqlConnector::forProfile($profile);
        $connector->insertTapHistoryIfMissing(LegacyMysqlConnector::mapTapEventRow($event));
    }
}
