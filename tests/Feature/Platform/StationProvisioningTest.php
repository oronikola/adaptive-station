<?php

namespace Tests\Feature\Platform;

use App\Enums\DeviceHeartbeatStatus;
use App\Enums\StationStatus;
use App\Models\DeviceHeartbeat;
use App\Models\DeviceSyncCursor;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StationProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_create_a_station_and_issue_an_activation_code_that_activates(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $storeResponse = $this->actingAs($platformAdmin)->post(route('platform.stations.store'), [
            'tenant_id' => $tenant->id,
            'name' => 'Main Gate',
            'station_code' => 'STN-0001',
        ]);
        $storeResponse->assertRedirect(route('platform.stations.index', ['tenant_id' => $tenant->id]));

        $station = Station::allTenants()->where('station_code', 'STN-0001')->firstOrFail();
        $this->assertSame(StationStatus::PendingActivation, $station->status);
        $this->assertDatabaseHas('master_data_changes', [
            'entity_id' => $station->id,
            'entity_type' => 'station_config',
            'operation' => 'upsert',
        ], 'tenant');

        $issueResponse = $this->actingAs($platformAdmin)
            ->post(route('platform.stations.activation-code', $station->id), ['tenant_id' => $tenant->id]);
        $issueResponse->assertRedirect(route('platform.stations.index'));
        $issueResponse->assertSessionHas('activationCode');

        $code = session('activationCode');

        $this->postJson('/api/v1/device/activate', ['activation_code' => $code])
            ->assertCreated();

        $this->assertSame(StationStatus::Active, $station->fresh()->status);
    }

    public function test_creating_a_station_auto_issues_a_kiosk_link_that_pairs_it_immediately(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $storeResponse = $this->actingAs($platformAdmin)->post(route('platform.stations.store'), [
            'tenant_id' => $tenant->id,
            'name' => 'Main Gate',
            'station_code' => 'LINK-0001',
        ]);
        $storeResponse->assertRedirect(route('platform.stations.index', ['tenant_id' => $tenant->id]));
        $storeResponse->assertSessionHas('pairingLink');

        $pairingLink = session('pairingLink');
        $token = last(explode('/', rtrim($pairingLink, '/')));

        $this->actingAs($platformAdmin)
            ->get(route('platform.stations.index', ['tenant_id' => $tenant->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('stations.data', 1)
                ->where('stations.data.0.station_code', 'LINK-0001'));

        $station = Station::allTenants()->where('station_code', 'LINK-0001')->firstOrFail();
        $this->assertSame(StationStatus::PendingActivation, $station->status);

        $this->postJson('/api/v1/device/pair', ['pairing_token' => $token])
            ->assertCreated()
            ->assertJsonPath('station.id', $station->id);

        $this->assertSame(StationStatus::Active, $station->fresh()->status);
    }

    public function test_station_code_must_be_unique_per_tenant(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        Station::factory()->for($tenant)->create(['station_code' => 'DUP-01']);

        $this->actingAs($platformAdmin)->post(route('platform.stations.store'), [
            'tenant_id' => $tenant->id,
            'name' => 'Another',
            'station_code' => 'DUP-01',
        ])->assertSessionHasErrors('station_code');
    }

    public function test_the_same_station_code_is_allowed_across_two_different_tenants(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        Station::factory()->for($tenantA)->create(['station_code' => 'SHARED-01']);

        $this->actingAs($platformAdmin)->post(route('platform.stations.store'), [
            'tenant_id' => $tenantB->id,
            'name' => 'Some Station',
            'station_code' => 'SHARED-01',
        ])->assertSessionHasNoErrors();
    }

    public function test_a_station_with_no_recorded_activity_can_be_deleted(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['station_code' => 'DEL-01']);
        StationCredential::issueFor($station, 'Kiosk 1', $platformAdmin);

        $response = $this->actingAs($platformAdmin)->post(route('platform.stations.destroy', $station->id), [
            '_method' => 'delete',
            'tenant_id' => $tenant->id,
            'confirm_code' => 'DEL-01',
        ]);

        $response->assertRedirect(route('platform.stations.index', ['tenant_id' => $tenant->id]));
        $this->assertNull(Station::allTenants()->find($station->id));
        $this->assertSame(0, StationCredential::allTenants()->where('station_id', $station->id)->count());
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'station.deleted',
            'entity_id' => $station->id,
        ]);
    }

    public function test_deleting_a_station_requires_typing_the_exact_station_code(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['station_code' => 'DEL-02']);

        $this->actingAs($platformAdmin)->delete(route('platform.stations.destroy', $station->id), [
            'tenant_id' => $tenant->id,
            'confirm_code' => 'wrong-code',
        ])->assertSessionHasErrors('confirm_code');

        $this->assertNotNull(Station::allTenants()->find($station->id));
    }

    public function test_a_station_with_only_heartbeats_and_a_sync_cursor_can_still_be_deleted(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['station_code' => 'DEL-04']);

        DeviceHeartbeat::allTenants()->create([
            'tenant_id' => $tenant->id,
            'station_id' => $station->id,
            'status' => DeviceHeartbeatStatus::Online,
            'reported_at' => now(),
        ]);
        DeviceSyncCursor::allTenants()->create(['station_id' => $station->id]);

        $response = $this->actingAs($platformAdmin)->delete(route('platform.stations.destroy', $station->id), [
            'tenant_id' => $tenant->id,
            'confirm_code' => 'DEL-04',
        ]);

        $response->assertRedirect(route('platform.stations.index', ['tenant_id' => $tenant->id]));
        $this->assertNull(Station::allTenants()->find($station->id));
    }

    public function test_a_station_with_recorded_tap_activity_cannot_be_deleted(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['station_code' => 'DEL-03']);
        TapEvent::factory()->for($tenant)->for($station)->create();

        $this->actingAs($platformAdmin)->delete(route('platform.stations.destroy', $station->id), [
            'tenant_id' => $tenant->id,
            'confirm_code' => 'DEL-03',
        ])->assertSessionHasErrors([
            'confirm_code' => 'This station has recorded attendance taps and cannot be deleted. Its history must be preserved.',
        ]);

        $this->assertNotNull(Station::allTenants()->find($station->id));
    }

    /**
     * The alternative to deletion for a station whose attendance history
     * must be preserved — see Station::retire()'s docblock.
     */
    public function test_a_station_with_recorded_tap_activity_can_be_retired_instead(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['station_code' => 'RET-01']);
        TapEvent::factory()->for($tenant)->for($station)->create();
        ['credential' => $credential] = StationCredential::issueFor($station, 'Kiosk 1', $platformAdmin);

        $response = $this->actingAs($platformAdmin)->patch(route('platform.stations.retire', $station->id), [
            'tenant_id' => $tenant->id,
        ]);

        $response->assertRedirect(route('platform.stations.index', ['tenant_id' => $tenant->id]));
        $this->assertSame(StationStatus::Retired, $station->fresh()->status);
        $this->assertNotNull($credential->fresh()->revoked_at);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'station.retired',
            'entity_id' => $station->id,
        ]);
        // The tap history that blocked deletion is still there, untouched.
        $this->assertSame(1, TapEvent::allTenants()->where('station_id', $station->id)->count());
    }

    public function test_a_retired_station_can_be_reactivated_and_returns_to_pending_activation(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create([
            'station_code' => 'RET-02',
            'status' => StationStatus::Retired,
        ]);

        $response = $this->actingAs($platformAdmin)->patch(route('platform.stations.reactivate', $station->id), [
            'tenant_id' => $tenant->id,
        ]);

        $response->assertRedirect(route('platform.stations.index', ['tenant_id' => $tenant->id]));
        $this->assertSame(StationStatus::PendingActivation, $station->fresh()->status);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'station.reactivated',
            'entity_id' => $station->id,
        ]);
    }
}
