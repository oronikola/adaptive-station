<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceActivationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_valid_activation_code_activates_the_station_and_returns_a_token(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        ['code' => $code] = StationActivationCode::issueFor($station, $admin);

        $response = $this->postJson('/api/v1/device/activate', ['activation_code' => $code]);

        $response->assertCreated()
            ->assertJsonPath('station.id', $station->id)
            ->assertJsonStructure(['station' => ['id', 'name', 'station_code'], 'credential_token']);

        $this->assertSame(StationStatus::Active, $station->fresh()->status);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'station.activated',
            'entity_id' => $station->id,
        ]);
    }

    public function test_an_invalid_activation_code_is_rejected(): void
    {
        $this->postJson('/api/v1/device/activate', ['activation_code' => 'not-a-real-code'])
            ->assertStatus(401);
    }

    public function test_activating_an_already_active_station_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        ['code' => $code] = StationActivationCode::issueFor($station, $admin);

        $this->postJson('/api/v1/device/activate', ['activation_code' => $code])
            ->assertStatus(409);
    }
}
