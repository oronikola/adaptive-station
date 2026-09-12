<?php

namespace Tests\Feature\Oversight;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchoolSelectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_generic_dashboard_route_sends_it_to_the_school_picker_before_any_school_is_selected(): void
    {
        $admin = User::factory()->adaptivestationAdmin()->create();

        $this->actingAs($admin)->get(route('dashboard'))
            ->assertRedirect(route('portal.dashboard'));

        $this->actingAs($admin)->get(route('portal.dashboard'))
            ->assertRedirect(route('oversight.schools.index'));
    }

    public function test_it_can_view_the_school_picker_listing_every_school(): void
    {
        $admin = User::factory()->adaptivestationAdmin()->create();
        Tenant::factory()->create(['name' => 'School A']);
        Tenant::factory()->create(['name' => 'School B', 'status' => 'suspended']);

        $response = $this->actingAs($admin)->get(route('oversight.schools.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('tenants', fn ($tenants) => count($tenants) === 2)
            ->where('stats.total', 2)
            ->where('stats.active', 1)
            ->where('stats.suspended', 1));
    }

    public function test_selecting_a_school_grants_portal_access_scoped_to_it(): void
    {
        $admin = User::factory()->adaptivestationAdmin()->create();
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)
            ->post(route('oversight.schools.select', $tenant))
            ->assertRedirect(route('portal.dashboard'));

        $this->actingAs($admin)->get(route('portal.dashboard'))->assertOk();
    }

    public function test_it_can_switch_to_a_different_school_without_logging_out(): void
    {
        $admin = User::factory()->adaptivestationAdmin()->create();
        $schoolA = Tenant::factory()->create();
        $schoolB = Tenant::factory()->create();

        $this->actingAs($admin)->post(route('oversight.schools.select', $schoolA));
        $this->assertSame($schoolA->id, session('oversight_tenant_id'));

        $this->actingAs($admin)->post(route('oversight.schools.select', $schoolB));
        $this->assertSame($schoolB->id, session('oversight_tenant_id'));
    }

    public function test_platform_routes_stay_forbidden_for_this_role(): void
    {
        $admin = User::factory()->adaptivestationAdmin()->create();

        $this->actingAs($admin)->get(route('platform.dashboard'))->assertForbidden();
        $this->actingAs($admin)->get(route('platform.tenants.index'))->assertForbidden();
    }

    public function test_a_tenant_admin_cannot_reach_the_school_picker(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($tenantAdmin)->get(route('oversight.schools.index'))->assertForbidden();
    }

    public function test_a_platform_super_admin_cannot_reach_the_school_picker(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($platformAdmin)->get(route('oversight.schools.index'))->assertForbidden();
    }
}
