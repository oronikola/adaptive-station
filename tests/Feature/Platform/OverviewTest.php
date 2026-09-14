<?php

namespace Tests\Feature\Platform;

use App\Enums\StationStatus;
use App\Enums\TenantStatus;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_view_the_overview(): void
    {
        $admin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($admin)->get(route('platform.overview.index'))->assertOk();
    }

    public function test_tenant_admin_cannot_view_the_platform_overview(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->get(route('platform.overview.index'))->assertForbidden();
    }

    public function test_stats_reflect_school_and_station_counts(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create(['status' => TenantStatus::Active]);
        Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.overview.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('stats.tenant_count', 1)
            ->where('stats.active_tenant_count', 1)
            ->where('stats.station_count', 2)
            ->where('stats.active_station_count', 1));
    }

    public function test_growth_reflects_cumulative_onboarded_and_active_schools(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        Tenant::factory()->create([
            'status' => TenantStatus::Active,
            'created_at' => now()->subWeeks(3),
        ]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.overview.index'));

        $response->assertInertia(fn ($page) => $page
            ->has('growth', 8)
            ->where('growth.0.total', 0)
            ->where('growth.7.total', 1)
            ->where('growth.7.active', 1));
    }

    public function test_recent_tenants_include_station_counts(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create(['name' => 'Riverside Elementary']);
        Station::factory()->for($tenant)->create();
        Station::factory()->for($tenant)->create();

        $response = $this->actingAs($platformAdmin)->get(route('platform.overview.index'));

        $response->assertInertia(fn ($page) => $page
            ->has('recentTenants', 1)
            ->where('recentTenants.0.name', 'Riverside Elementary')
            ->where('recentTenants.0.station_count', 2));
    }
}
