<?php

namespace App\Console\Commands;

use App\Enums\IntegrationRunStatus;
use App\Models\AuditLog;
use App\Models\DeviceHeartbeat;
use App\Models\IntegrationRun;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Date;

/**
 * Implements ADAPTIVE_STATION_DATABASE_DESIGN.md §9's retention policy for
 * device_heartbeats/audit_logs/completed integration_runs. Deliberately does
 * NOT touch tap_events, people, rfid_cards, or import_batches/exceptions —
 * those are durable records with tenant/legal retention decisions, not an
 * infra default. Runs across all tenants via allTenants(), matching the
 * existing escape-hatch convention for deliberate cross-tenant operations.
 */
class PruneOperationalDataCommand extends Command
{
    protected $signature = 'retention:prune';

    protected $description = 'Delete operational data (heartbeats, audit logs, completed integration runs) past its configured retention window';

    public function handle(): int
    {
        $heartbeatsCutoff = Date::now()->subDays(config('retention.device_heartbeats_days'));
        $heartbeatsDeleted = DeviceHeartbeat::allTenants()
            ->where('reported_at', '<', $heartbeatsCutoff)
            ->delete();
        $this->info("Pruned {$heartbeatsDeleted} device_heartbeats older than {$heartbeatsCutoff->toDateString()}.");

        $auditLogsCutoff = Date::now()->subDays(config('retention.audit_logs_days'));
        $auditLogsDeleted = AuditLog::allTenants()
            ->where('created_at', '<', $auditLogsCutoff)
            ->delete();
        $this->info("Pruned {$auditLogsDeleted} audit_logs older than {$auditLogsCutoff->toDateString()}.");

        $integrationRunsCutoff = Date::now()->subDays(config('retention.integration_runs_days'));
        $integrationRunsDeleted = IntegrationRun::allTenants()
            ->whereIn('status', [IntegrationRunStatus::Succeeded, IntegrationRunStatus::Failed, IntegrationRunStatus::Partial])
            ->where('created_at', '<', $integrationRunsCutoff)
            ->delete();
        $this->info("Pruned {$integrationRunsDeleted} completed integration_runs older than {$integrationRunsCutoff->toDateString()}.");

        return self::SUCCESS;
    }
}
