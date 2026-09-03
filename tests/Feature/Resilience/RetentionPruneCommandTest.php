<?php

namespace Tests\Feature\Resilience;

use App\Enums\IntegrationRunDirection;
use App\Enums\IntegrationRunStatus;
use App\Models\AuditLog;
use App\Models\DeviceHeartbeat;
use App\Models\IntegrationProfile;
use App\Models\IntegrationRun;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RetentionPruneCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_prunes_old_operational_data_but_keeps_recent_and_open_rows(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = \App\Models\Station::factory()->for($tenant)->create();

        // Old heartbeat (beyond default 90-day window) vs recent one.
        $oldHeartbeat = DeviceHeartbeat::create([
            'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'pending_event_count' => 0, 'status' => 'online',
            'reported_at' => Date::now()->subDays(200),
        ]);
        $recentHeartbeat = DeviceHeartbeat::create([
            'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'pending_event_count' => 0, 'status' => 'online',
            'reported_at' => Date::now()->subDay(),
        ]);

        // Old audit log (beyond default 365-day window) vs recent one.
        $oldAuditLog = AuditLog::record('tenant.created', $admin, $tenant->id, 'tenant', $tenant->id);
        DB::table('audit_logs')->where('id', $oldAuditLog->id)->update(['created_at' => Date::now()->subDays(400)]);
        $recentAuditLog = AuditLog::record('tenant.created', $admin, $tenant->id, 'tenant', $tenant->id);

        // Old completed integration run (beyond default 180-day window) vs an
        // equally old but still-open run, which must survive regardless of age.
        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy', 'driver' => 'legacy_mysql', 'direction' => 'import_only',
            'config_encrypted' => ['host' => 'unused'],
        ], $admin);

        $oldSucceededRun = IntegrationRun::start($profile, IntegrationRunDirection::Import);
        $oldSucceededRun->finish(IntegrationRunStatus::Succeeded, ['exported' => 1]);
        DB::table('integration_runs')->where('id', $oldSucceededRun->id)->update(['created_at' => Date::now()->subDays(200)]);

        $oldRunningRun = IntegrationRun::start($profile, IntegrationRunDirection::Import);
        DB::table('integration_runs')->where('id', $oldRunningRun->id)->update(['created_at' => Date::now()->subDays(200)]);

        $this->artisan('retention:prune')->assertSuccessful();

        $this->assertDatabaseMissing('device_heartbeats', ['id' => $oldHeartbeat->id]);
        $this->assertDatabaseHas('device_heartbeats', ['id' => $recentHeartbeat->id]);

        $this->assertDatabaseMissing('audit_logs', ['id' => $oldAuditLog->id]);
        $this->assertDatabaseHas('audit_logs', ['id' => $recentAuditLog->id]);

        $this->assertDatabaseMissing('integration_runs', ['id' => $oldSucceededRun->id]);
        $this->assertDatabaseHas('integration_runs', ['id' => $oldRunningRun->id]);
    }
}
