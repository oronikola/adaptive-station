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
        $storeResponse->assertRedirect(route('platform.stations.index'));

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
        $storeResponse->assertRedirect(route('platform.stations.index'));
        $storeResponse->assertSessionHas('pairingLink');

        $station = Station::allTenants()->where('station_code', 'LINK-0001')->firstOrFail();
        $this->assertSame(StationStatus::PendingActivation, $station->status);

        $pairingLink = session('pairingLink');
        $token = last(explode('/', rtrim($pairingLink, '/')));

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

        $response = $this->actingAs($platformAdmin)->delete(route('platform.stations.destroy', $station->id), [
            'tenant_id' => $tenant->id,
            'confirm_code' => 'DEL-01',
        ]);

        $response->assertRedirect(route('platform.stations.index'));
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

        $response->assertRedirect(route('platform.stations.index'));
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
        ])->assertStatus(409);

        $this->assertNotNull(Station::allTenants()->find($station->id));
    }
}
