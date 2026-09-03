<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformAccessCrossRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_tenant_admin_is_forbidden_from_every_platform_route(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->get(route('platform.tenants.index'))->assertForbidden();
        $this->actingAs($admin)->get(route('platform.stations.index'))->assertForbidden();
        $this->actingAs($admin)->get(route('platform.audit-log.index'))->assertForbidden();
    }

    public function test_a_platform_super_admin_is_forbidden_from_the_tenant_portal(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($platformAdmin)->get(route('portal.people.index'))->assertForbidden();
    }
}
