<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\StationPairingToken;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DevicePairingTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_valid_pairing_link_activates_a_pending_station_and_returns_a_token(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        ['token' => $token] = StationPairingToken::issueFor($station, $admin);

        $response = $this->postJson('/api/v1/device/pair', ['pairing_token' => $token]);

        $response->assertCreated()
            ->assertJsonPath('station.id', $station->id)
            ->assertJsonStructure(['station' => ['id', 'name', 'station_code'], 'credential_token']);

        $this->assertSame(StationStatus::Active, $station->fresh()->status);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'station.activated_via_link',
            'entity_id' => $station->id,
        ]);
    }

    public function test_the_same_pairing_link_can_be_redeemed_again_to_re_pair_an_already_active_station(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        ['token' => $token] = StationPairingToken::issueFor($station, $admin);

        $this->postJson('/api/v1/device/pair', ['pairing_token' => $token])->assertCreated();

        $second = $this->postJson('/api/v1/device/pair', ['pairing_token' => $token]);

        $second->assertCreated()->assertJsonPath('station.id', $station->id);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'station.repaired_via_link',
            'entity_id' => $station->id,
        ]);
        $this->assertSame(2, StationCredential::allTenants()->where('station_id', $station->id)->count());
    }

    public function test_an_invalid_pairing_link_is_rejected(): void
    {
        $this->postJson('/api/v1/device/pair', ['pairing_token' => 'not-a-real-token'])
            ->assertStatus(401);
    }

    public function test_a_revoked_pairing_link_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create();

        ['pairingToken' => $pairingToken, 'token' => $token] = StationPairingToken::issueFor($station, $admin);
        StationPairingToken::revoke($pairingToken, $admin);

        $this->postJson('/api/v1/device/pair', ['pairing_token' => $token])
            ->assertStatus(401);
    }

    public function test_pairing_a_disabled_station_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Disabled]);

        ['token' => $token] = StationPairingToken::issueFor($station, $admin);

        $this->postJson('/api/v1/device/pair', ['pairing_token' => $token])
            ->assertStatus(409);
    }
}
