<?php

namespace Tests\Feature\Portal;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StationManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_admin_can_view_station_detail(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $this->actingAs($admin)->get(route('portal.stations.show', $station))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('station.id', $station->id));
    }

    /**
     * Regression test for the missing wiring bug: a controller can flash
     * ->with('pairingLink', ...) all it wants, but unless that key is also
     * listed in HandleInertiaRequests::share()'s 'flash' array, the frontend
     * never actually receives it — assertSessionHas() alone doesn't catch
     * this, since the session key exists regardless.
     */
    public function test_resetting_the_station_link_flashes_it_to_the_next_inertia_page(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create();

        $response = $this->actingAs($admin)
            ->followingRedirects()
            ->post(route('portal.stations.pairing-link', $station));

        $response->assertInertia(fn ($page) => $page->where(
            'flash.pairingLink',
            fn ($link) => is_string($link) && str_contains($link, url('/kiosk/pair/')),
        ));
    }

    public function test_tenant_admin_can_update_station_configuration(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $this->actingAs($admin)->patch(route('portal.stations.configuration', $station), [
            'configuration' => ['clock_format' => '24h'],
        ])->assertRedirect(route('portal.stations.show', $station));

        $this->assertSame(['clock_format' => '24h'], $station->fresh()->configuration);

        $this->assertDatabaseHas('master_data_changes', [
            'entity_id' => $station->id,
            'entity_type' => 'station_config',
            'operation' => 'upsert',
        ], 'tenant');
    }

    public function test_tenant_admin_can_issue_and_revoke_a_credential(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $issueResponse = $this->actingAs($admin)->post(route('portal.stations.credentials.store', $station), [
            'label' => 'Front Desk',
        ]);
        $issueResponse->assertRedirect(route('portal.stations.show', $station));
        $issueResponse->assertSessionHas('deviceToken');

        $credential = StationCredential::allTenants()->where('station_id', $station->id)->firstOrFail();
        $this->assertNull($credential->revoked_at);

        $this->actingAs($admin)
            ->patch(route('portal.stations.credentials.revoke', [$station, $credential]))
            ->assertRedirect(route('portal.stations.show', $station));

        $this->assertNotNull($credential->fresh()->revoked_at);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'station_credential.revoked',
            'entity_id' => $credential->id,
        ]);
    }

    public function test_tenant_admin_can_issue_an_activation_code_that_activates_via_the_device_api(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        $response = $this->actingAs($admin)->post(route('portal.stations.activation-code', $station));
        $response->assertRedirect(route('portal.stations.show', $station));
        $response->assertSessionHas('activationCode');

        $code = session('activationCode');

        $this->postJson('/api/v1/device/activate', ['activation_code' => $code])->assertCreated();

        $this->assertSame(StationStatus::Active, $station->fresh()->status);
    }

    public function test_a_tenant_admin_cannot_view_another_tenants_station_detail(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $stationB = Station::factory()->for($tenantB)->create();

        $this->actingAs($adminA)->get(route('portal.stations.show', $stationB))->assertNotFound();
    }

    public function test_tenant_operator_cannot_update_configuration_or_issue_credentials(): void
    {
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $this->actingAs($operator)->patch(route('portal.stations.configuration', $station), [
            'configuration' => [],
        ])->assertForbidden();

        $this->actingAs($operator)->post(route('portal.stations.credentials.store', $station))
            ->assertForbidden();
    }

    public function test_tenant_admin_can_fetch_station_detail_as_json_for_manage_modal(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $response = $this->actingAs($admin)
            ->getJson(route('portal.stations.show', $station));

        $response->assertOk()
            ->assertJsonStructure([
                'station' => [
                    'id',
                    'name',
                    'station_code',
                    'status',
                    'is_online',
                ],
                'credentials',
            ])
            ->assertJsonPath('station.id', $station->id)
            ->assertJsonPath('station.station_code', $station->station_code);
    }

    public function test_tenant_admin_can_issue_activation_code_via_json_modal_request(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        $response = $this->actingAs($admin)
            ->postJson(route('portal.stations.activation-code', $station));

        $response->assertOk()
            ->assertJsonStructure([
                'message',
                'activationCode',
            ]);

        $this->assertNotEmpty($response->json('activationCode'));
    }

    public function test_tenant_admin_can_update_configuration_via_json_modal_request(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $response = $this->actingAs($admin)
            ->patchJson(route('portal.stations.configuration', $station), [
                'configuration' => ['kiosk_mode' => true, 'refresh_rate' => 30],
            ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Configuration updated.')
            ->assertJsonPath('station.configuration.kiosk_mode', true);

        $this->assertSame(['kiosk_mode' => true, 'refresh_rate' => 30], $station->fresh()->configuration);
    }

    public function test_tenant_admin_can_issue_and_revoke_credential_via_json_modal_request(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $issueResponse = $this->actingAs($admin)
            ->postJson(route('portal.stations.credentials.store', $station), [
                'label' => 'Gate Terminal 02',
            ]);

        $issueResponse->assertOk()
            ->assertJsonStructure([
                'message',
                'deviceToken',
                'credentials',
            ]);

        $this->assertNotEmpty($issueResponse->json('deviceToken'));

        $credential = StationCredential::allTenants()->where('station_id', $station->id)->firstOrFail();

        $revokeResponse = $this->actingAs($admin)
            ->patchJson(route('portal.stations.credentials.revoke', [$station, $credential]));

        $revokeResponse->assertOk()
            ->assertJsonPath('message', 'Credential revoked.');

        $this->assertNotNull($credential->fresh()->revoked_at);
    }
}
