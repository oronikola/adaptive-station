<?php

namespace App\Jobs;

use App\Enums\IntegrationDirection;
use App\Enums\IntegrationProfileStatus;
use App\Models\IntegrationProfile;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Services\Integrations\EssentielTapResolver;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * The queued counterpart to TapEventResolveController's synchronous path —
 * both call the exact same EssentielTapResolver::resolve(), so they can
 * never drift apart in behavior. This one is used for every ordinary
 * batch-uploaded tap (see TapEvent::acceptBatch()); the synchronous path is
 * used only for the kiosk's own "card not in my local cache" fallback,
 * which resolves inline instead of dispatching this job — see
 * TapEvent::acceptBatch()'s $resolveEssentielSynchronously parameter. A
 * given tap is only ever resolved once, by whichever of the two paths
 * acceptBatch() chose for it.
 *
 * Fired for a tenant with an active essentiel_api IntegrationProfile instead
 * of (never alongside — see acceptBatch()) the legacy_mysql direct-database
 * driver or the local ParentAccount-driven notification. A tenant with no
 * enabled essentiel_api profile is a silent no-op, same reasoning as the
 * legacy job.
 */
class PushTapEventToEssentielJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Bounded retry — an unreachable/misconfigured essentiel connection
     * simply misses this one tap's push and SMS; there is no batch backstop
     * for essentiel the way RunLegacyExportJob backstops legacy_mysql.
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

    public function handle(EssentielTapResolver $resolver): void
    {
        $tenant = Tenant::findOrFail($this->tenantId);
        TenantDatabase::use($tenant);
        app(TenantContext::class)->set($tenant->id);

        $profile = IntegrationProfile::allTenants()
            ->where('tenant_id', $this->tenantId)
            ->where('driver', 'essentiel_api')
            ->where('status', IntegrationProfileStatus::Active)
            ->whereIn('direction', [IntegrationDirection::ExportOnly, IntegrationDirection::Bidirectional])
            ->first();

        // No opted-in essentiel connection for this school — nothing to do.
        if ($profile === null) {
            return;
        }

        $event = TapEvent::allTenants()->with(['station', 'person'])->find($this->tapEventId);
        if ($event === null) {
            return;
        }

        $resolver->resolve($tenant, $profile, $event);
    }
}
