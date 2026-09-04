<?php

namespace App\Console\Commands;

use App\Enums\IntegrationRunStatus;
use App\Models\AuditLog;
use App\Models\DeviceHeartbeat;
use App\Models\IntegrationRun;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Date;

/**
 * Implements ADAPTIVE_STATION_DATABASE_DESIGN.md §9's retention policy for
 * device_heartbeats/audit_logs/completed integration_runs. Deliberately does
 * NOT touch tap_events, people, rfid_cards, or import_batches/exceptions —
 * those are durable records with tenant/legal retention decisions, not an
 * infra default. device_heartbeats/integration_runs live per-tenant, so
 * pruning them means looping every tenant's own database; audit_logs stays
 * central, so that step is still one query.
 */
class PruneOperationalDataCommand extends Command
{
    protected $signature = 'retention:prune';

    protected $description = 'Delete operational data (heartbeats, audit logs, completed integration runs) past its configured retention window';

    public function handle(): int
    {
        $heartbeatsCutoff = Date::now()->subDays(config('retention.device_heartbeats_days'));
        $integrationRunsCutoff = Date::now()->subDays(config('retention.integration_runs_days'));

        $totalHeartbeatsDeleted = 0;
        $totalIntegrationRunsDeleted = 0;

        foreach (Tenant::all() as $tenant) {
            TenantDatabase::use($tenant);

            $totalHeartbeatsDeleted += DeviceHeartbeat::allTenants()
                ->where('reported_at', '<', $heartbeatsCutoff)
                ->delete();

            $totalIntegrationRunsDeleted += IntegrationRun::allTenants()
                ->whereIn('status', [IntegrationRunStatus::Succeeded, IntegrationRunStatus::Failed, IntegrationRunStatus::Partial])
                ->where('created_at', '<', $integrationRunsCutoff)
                ->delete();
        }

        $this->info("Pruned {$totalHeartbeatsDeleted} device_heartbeats older than {$heartbeatsCutoff->toDateString()} across all tenants.");
        $this->info("Pruned {$totalIntegrationRunsDeleted} completed integration_runs older than {$integrationRunsCutoff->toDateString()} across all tenants.");

        $auditLogsCutoff = Date::now()->subDays(config('retention.audit_logs_days'));
        $auditLogsDeleted = AuditLog::allTenants()
            ->where('created_at', '<', $auditLogsCutoff)
            ->delete();
        $this->info("Pruned {$auditLogsDeleted} audit_logs older than {$auditLogsCutoff->toDateString()}.");

        return self::SUCCESS;
    }
}
