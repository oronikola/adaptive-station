<?php

namespace Tests\Feature\Portal;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StationHealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_both_roles_can_view_the_station_list(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        Station::factory()->for($tenant)->create();

        $this->actingAs($admin)->get(route('portal.stations.index'))->assertOk();
        $this->actingAs($operator)->get(route('portal.stations.index'))->assertOk();
    }

    public function test_a_recently_seen_active_station_is_online(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Station::factory()->for($tenant)->create([
            'status' => StationStatus::Active,
            'last_seen_at' => now()->subMinutes(2),
        ]);

        $this->actingAs($admin)->get(route('portal.stations.index'))
            ->assertInertia(fn ($page) => $page->where('stations.data.0.is_online', true));
    }

    public function test_a_stale_station_is_offline(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Station::factory()->for($tenant)->create([
            'status' => StationStatus::Active,
            'last_seen_at' => now()->subMinutes(10),
        ]);

        $this->actingAs($admin)->get(route('portal.stations.index'))
            ->assertInertia(fn ($page) => $page->where('stations.data.0.is_online', false));
    }

    public function test_a_disabled_station_is_never_online_regardless_of_last_seen(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Station::factory()->for($tenant)->create([
            'status' => StationStatus::Disabled,
            'last_seen_at' => now(),
        ]);

        $this->actingAs($admin)->get(route('portal.stations.index'))
            ->assertInertia(fn ($page) => $page->where('stations.data.0.is_online', false));
    }

    public function test_a_tenant_admin_never_sees_another_tenants_stations(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        Station::factory()->for($tenantA)->create(['name' => 'Station A']);
        Station::factory()->for($tenantB)->create(['name' => 'Station B']);

        $this->actingAs($adminA)->get(route('portal.stations.index'))
            ->assertInertia(fn ($page) => $page
                ->has('stations.data', 1)
                ->where('stations.data.0.name', 'Station A'));
    }
}
