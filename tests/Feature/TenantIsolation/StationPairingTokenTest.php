<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\Station;
use App\Models\StationPairingToken;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StationPairingTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_pairing_token_can_be_redeemed_more_than_once(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        ['token' => $token] = StationPairingToken::issueFor($station, $admin);

        $this->assertNotNull(StationPairingToken::redeem($token));
        $this->assertNotNull(StationPairingToken::redeem($token));
    }

    public function test_issuing_a_new_pairing_link_revokes_the_previous_one(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        ['pairingToken' => $first, 'token' => $firstToken] = StationPairingToken::issueFor($station, $admin);
        ['token' => $secondToken] = StationPairingToken::issueFor($station, $admin);

        $this->assertNotNull($first->fresh()->revoked_at);
        $this->assertNull(StationPairingToken::redeem($firstToken));
        $this->assertNotNull(StationPairingToken::redeem($secondToken));
    }

    public function test_a_revoked_pairing_token_cannot_be_redeemed(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        ['pairingToken' => $pairingToken, 'token' => $token] = StationPairingToken::issueFor($station, $admin);
        StationPairingToken::revoke($pairingToken, $admin);

        $this->assertNull(StationPairingToken::redeem($token));
    }

    public function test_an_incorrect_token_never_redeems_anything(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        StationPairingToken::issueFor($station, $admin);

        $this->assertNull(StationPairingToken::redeem('not-the-real-token'));
    }
}
