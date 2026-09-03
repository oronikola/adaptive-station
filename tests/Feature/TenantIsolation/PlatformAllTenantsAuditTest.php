<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\AuditLog;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformAllTenantsAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_platform_wide_query_returns_cross_tenant_rows_and_is_audited(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        Station::factory()->for($tenantA)->create();
        Station::factory()->for($tenantB)->create();

        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $stations = Station::allTenants()->get();

        $this->assertCount(2, $stations);
        $this->assertSame(2, $stations->pluck('tenant_id')->unique()->count());

        AuditLog::record('station.list_all_tenants', $platformAdmin, null, 'station');

        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $platformAdmin->id,
            'action' => 'station.list_all_tenants',
            'tenant_id' => null,
        ]);
    }
}
