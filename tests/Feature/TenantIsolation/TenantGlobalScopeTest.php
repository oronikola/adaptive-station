<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\Station;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantGlobalScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_scoped_queries_only_return_the_current_tenants_rows(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $stationA = Station::factory()->for($tenantA)->create();
        $stationB = Station::factory()->for($tenantB)->create();

        app(TenantContext::class)->set($tenantA->id);

        $ids = Station::all()->pluck('id');

        $this->assertTrue($ids->contains($stationA->id));
        $this->assertFalse($ids->contains($stationB->id));
        $this->assertNull(Station::find($stationB->id));
    }

    public function test_all_tenants_bypasses_the_scope_explicitly(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        Station::factory()->for($tenantA)->create();
        $stationB = Station::factory()->for($tenantB)->create();

        app(TenantContext::class)->set($tenantA->id);

        $this->assertNull(Station::find($stationB->id));
        $this->assertNotNull(Station::allTenants()->find($stationB->id));
    }

    public function test_scope_fails_closed_with_no_tenant_context(): void
    {
        Station::factory()->create();

        app(TenantContext::class)->clear();

        $this->assertCount(0, Station::all());
    }
}
