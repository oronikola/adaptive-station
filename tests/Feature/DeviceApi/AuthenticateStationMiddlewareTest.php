<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticateStationMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_missing_bearer_token_is_rejected(): void
    {
        $this->postJson('/api/v1/device/session')->assertStatus(401);
    }

    public function test_garbage_token_is_rejected(): void
    {
        $this->withHeader('Authorization', 'Bearer not-a-real-token')
            ->postJson('/api/v1/device/session')
            ->assertStatus(401);
    }

    public function test_revoked_credential_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['credential' => $credential, 'token' => $token] = StationCredential::issueFor($station);
        $credential->forceFill(['revoked_at' => now()])->save();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/session')
            ->assertStatus(401);
    }

    public function test_an_expired_credential_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['credential' => $credential, 'token' => $token] = StationCredential::issueFor($station);
        $credential->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/session')
            ->assertStatus(401);
    }

    public function test_a_non_active_station_is_rejected_with_403(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Disabled]);
        ['token' => $token] = StationCredential::issueFor($station);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/session')
            ->assertStatus(403);
    }

    public function test_a_valid_active_station_is_authenticated(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['credential' => $credential, 'token' => $token] = StationCredential::issueFor($station);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/session');

        $response->assertOk()->assertJsonPath('station.id', $station->id);
        $this->assertNotNull($credential->fresh()->last_used_at);
    }
}
