<?php

namespace Tests\Feature\Platform;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StationManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_view_all_stations_and_switch_schools(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenantA = Tenant::factory()->create(['name' => 'Alpha School']);
        $tenantB = Tenant::factory()->create(['name' => 'Beta High']);

        $stationA = Station::factory()->for($tenantA)->create(['name' => 'Station Alpha', 'status' => StationStatus::Active]);
        $stationB = Station::factory()->for($tenantB)->create(['name' => 'Station Beta', 'status' => StationStatus::Active]);

        // Default view: shows all stations across all schools
        $this->actingAs($superAdmin)->get(route('platform.stations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Platform/stations/stations-list-screen')
                ->has('stations.data', 2)
                ->has('tenants', 2)
                ->has('allStationOptions', 2)
            );

        // School Switcher: filter to School A only
        $this->actingAs($superAdmin)->get(route('platform.stations.index', ['tenant_id' => $tenantA->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Platform/stations/stations-list-screen')
                ->has('stations.data', 1)
                ->has('allStationOptions', 1)
                ->where('stations.data.0.id', $stationA->id)
                ->where('stations.data.0.tenant_id', $tenantA->id)
                ->where('filters.tenant_id', (string) $tenantA->id)
            );

        // School Switcher: filter to School B only
        $this->actingAs($superAdmin)->get(route('platform.stations.index', ['tenant_id' => $tenantB->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Platform/stations/stations-list-screen')
                ->has('stations.data', 1)
                ->where('stations.data.0.id', $stationB->id)
                ->where('stations.data.0.tenant_id', $tenantB->id)
            );
    }

    public function test_platform_super_admin_can_filter_stations_by_status_view(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $activeStation = Station::factory()->for($tenant)->create([
            'name' => 'Active 1',
            'status' => StationStatus::Active,
        ]);
        $pendingStation = Station::factory()->for($tenant)->create([
            'name' => 'Pending 1',
            'status' => StationStatus::PendingActivation,
        ]);

        // Filter: Pending Activation view
        $this->actingAs($superAdmin)->get(route('platform.stations.index', ['status' => 'pending_activation']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('stations.data', 1)
                ->where('stations.data.0.id', $pendingStation->id)
                ->where('stations.data.0.status', 'pending_activation')
            );

        // Filter: Active Stations view
        $this->actingAs($superAdmin)->get(route('platform.stations.index', ['status' => 'active']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('stations.data', 1)
                ->where('stations.data.0.id', $activeStation->id)
                ->where('stations.data.0.status', 'active')
            );
    }

    public function test_platform_super_admin_can_view_specific_station_details(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create([
            'name' => 'East Gate Kiosk',
            'status' => StationStatus::Active,
        ]);

        $this->actingAs($superAdmin)->get(route('platform.stations.show', ['station' => $station->id, 'tenant_id' => $tenant->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Platform/stations/station-detail-screen')
                ->where('station.id', $station->id)
                ->where('station.name', 'East Gate Kiosk')
                ->where('tenant.id', $tenant->id)
                ->has('schoolStations')
                ->has('credentials')
            );
    }

    public function test_platform_super_admin_can_update_station_configuration(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $this->actingAs($superAdmin)->patch(route('platform.stations.configuration', $station->id), [
            'tenant_id' => $tenant->id,
            'configuration' => ['theme' => 'dark', 'sync_frequency' => 30],
        ])->assertRedirect(route('platform.stations.show', ['station' => $station->id, 'tenant_id' => $tenant->id]));

        $this->assertSame(['theme' => 'dark', 'sync_frequency' => 30], $station->fresh()->configuration);
    }

    public function test_platform_super_admin_can_rename_a_station(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['name' => 'Old Name', 'station_code' => 'GATE-01', 'status' => StationStatus::Active]);

        $this->actingAs($superAdmin)->patch(route('platform.stations.rename', $station->id), [
            'tenant_id' => $tenant->id,
            'name' => 'Main Gate',
        ])->assertRedirect(route('platform.stations.show', ['station' => $station->id, 'tenant_id' => $tenant->id]));

        $fresh = $station->fresh();
        $this->assertSame('Main Gate', $fresh->name);
        $this->assertSame('GATE-01', $fresh->station_code);
    }

    public function test_renaming_a_station_requires_a_name(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['name' => 'Old Name', 'status' => StationStatus::Active]);

        $this->actingAs($superAdmin)->patch(route('platform.stations.rename', $station->id), [
            'tenant_id' => $tenant->id,
            'name' => '',
        ])->assertSessionHasErrors('name');

        $this->assertSame('Old Name', $station->fresh()->name);
    }

    public function test_platform_super_admin_can_edit_a_stations_code(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['station_code' => 'GATE-01', 'status' => StationStatus::Active]);

        $this->actingAs($superAdmin)->patch(route('platform.stations.update-code', $station->id), [
            'tenant_id' => $tenant->id,
            'station_code' => 'main-gate-01',
        ])->assertRedirect(route('platform.stations.show', ['station' => $station->id, 'tenant_id' => $tenant->id]));

        $this->assertSame('main-gate-01', $station->fresh()->station_code);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'station.code_updated',
            'entity_id' => $station->id,
        ]);
    }

    public function test_editing_a_stations_code_requires_a_value(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['station_code' => 'GATE-01', 'status' => StationStatus::Active]);

        $this->actingAs($superAdmin)->patch(route('platform.stations.update-code', $station->id), [
            'tenant_id' => $tenant->id,
            'station_code' => '',
        ])->assertSessionHasErrors('station_code');

        $this->assertSame('GATE-01', $station->fresh()->station_code);
    }

    public function test_a_stations_code_must_stay_unique_within_its_tenant(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $stationA = Station::factory()->for($tenant)->create(['station_code' => 'GATE-01', 'status' => StationStatus::Active]);
        $stationB = Station::factory()->for($tenant)->create(['station_code' => 'GATE-02', 'status' => StationStatus::Active]);

        $this->actingAs($superAdmin)->patch(route('platform.stations.update-code', $stationB->id), [
            'tenant_id' => $tenant->id,
            'station_code' => 'GATE-01',
        ])->assertSessionHasErrors('station_code');

        $this->assertSame('GATE-02', $stationB->fresh()->station_code);
        $this->assertNotNull($stationA->fresh());
    }

    public function test_the_same_station_code_is_allowed_across_two_different_tenants_when_editing(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        Station::factory()->for($tenantA)->create(['station_code' => 'SHARED-01']);
        $stationB = Station::factory()->for($tenantB)->create(['station_code' => 'GATE-02']);

        $this->actingAs($superAdmin)->patch(route('platform.stations.update-code', $stationB->id), [
            'tenant_id' => $tenantB->id,
            'station_code' => 'SHARED-01',
        ])->assertSessionHasNoErrors();

        $this->assertSame('SHARED-01', $stationB->fresh()->station_code);
    }

    public function test_platform_super_admin_can_issue_and_revoke_credentials(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $issueResponse = $this->actingAs($superAdmin)->post(route('platform.stations.credentials.store', $station->id), [
            'tenant_id' => $tenant->id,
            'label' => 'Main Entrance Tablet',
        ]);
        $issueResponse->assertRedirect(route('platform.stations.show', ['station' => $station->id, 'tenant_id' => $tenant->id]));
        $issueResponse->assertSessionHas('deviceToken');

        $credential = StationCredential::allTenants()->where('station_id', $station->id)->firstOrFail();
        $this->assertNull($credential->revoked_at);

        $this->actingAs($superAdmin)
            ->patch(route('platform.stations.credentials.revoke', ['station' => $station->id, 'credential' => $credential->id]), [
                'tenant_id' => $tenant->id,
            ])
            ->assertRedirect(route('platform.stations.show', ['station' => $station->id, 'tenant_id' => $tenant->id]));

        $this->assertNotNull($credential->fresh()->revoked_at);
    }

    public function test_platform_super_admin_can_issue_activation_code_from_show_page(): void
    {
        $superAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        $response = $this->actingAs($superAdmin)->post(route('platform.stations.activation-code', $station->id), [
            'tenant_id' => $tenant->id,
            'redirect_to' => 'show',
        ]);
        $response->assertRedirect(route('platform.stations.show', ['station' => $station->id, 'tenant_id' => $tenant->id]));
        $response->assertSessionHas('activationCode');
    }
}
