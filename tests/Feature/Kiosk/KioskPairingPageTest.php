<?php

namespace Tests\Feature\Kiosk;

use App\Models\Station;
use App\Models\StationPairingToken;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KioskPairingPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_valid_pairing_link_resolves_the_station_name_for_the_page(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['name' => 'Main Gate']);

        ['token' => $token] = StationPairingToken::issueFor($station, $admin);

        $this->get("/kiosk/pair/{$token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('pairingToken', $token)
                ->where('stationName', 'Main Gate'));
    }

    public function test_a_revoked_or_invalid_pairing_link_resolves_no_station_name(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['name' => 'Main Gate']);

        ['pairingToken' => $pairingToken, 'token' => $token] = StationPairingToken::issueFor($station, $admin);
        StationPairingToken::revoke($pairingToken, $admin);

        $this->get("/kiosk/pair/{$token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('stationName', null));

        $this->get('/kiosk/pair/not-a-real-token')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('stationName', null));
    }

    public function test_the_plain_kiosk_route_resolves_no_station_name(): void
    {
        $this->get('/kiosk')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('pairingToken', null)->where('stationName', null));
    }
}
