<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceHeartbeatTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_heartbeat_updates_station_health_fields_and_is_recorded(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/heartbeat', [
                'app_version' => '1.2.3',
                'pending_event_count' => 4,
                'status' => 'online',
            ]);

        $response->assertOk()->assertJson(['status' => 'ok']);

        $station->refresh();
        $this->assertSame('1.2.3', $station->app_version);
        $this->assertSame(4, $station->last_pending_count);
        $this->assertNotNull($station->last_seen_at);

        $this->assertDatabaseHas('device_heartbeats', [
            'station_id' => $station->id,
            'pending_event_count' => 4,
        ]);
    }
}
