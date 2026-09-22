<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\KioskMedia;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Covers the kiosk's idle-screen media feed — Api\Device\KioskMediaController.
 * Deliberately scoped to the ONE station the request's credential
 * authenticates as, never any other station even within the same tenant
 * (see KioskMedia's docblock: media is per-station, not per-tenant, so a
 * superadmin can give different kiosks different content).
 */
class KioskMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_station_only_sees_its_own_active_media_in_position_order(): void
    {
        Storage::fake('r2');

        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $otherStation = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'image', 'disk_path' => 'kiosk-media/b.png', 'position' => 2, 'is_active' => true]);
        KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'video', 'disk_path' => 'kiosk-media/a.mp4', 'position' => 1, 'duration_seconds' => 15, 'is_active' => true]);
        KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'image', 'disk_path' => 'kiosk-media/inactive.png', 'position' => 0, 'is_active' => false]);
        // Belongs to a different station at the same school — must never appear.
        KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $otherStation->id, 'type' => 'image', 'disk_path' => 'kiosk-media/other.png', 'position' => 0, 'is_active' => true]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/device/kiosk-media');

        $response->assertOk();
        $media = $response->json('media');
        $this->assertCount(2, $media);
        $this->assertSame('video', $media[0]['type']);
        $this->assertSame(15, $media[0]['duration_seconds']);
        $this->assertSame('image', $media[1]['type']);
        $this->assertStringContainsString('kiosk-media/a.mp4', $media[0]['url']);
    }

    public function test_a_station_with_no_media_gets_an_empty_list(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/v1/device/kiosk-media')
            ->assertOk()
            ->assertJson(['media' => []]);
    }

    public function test_it_requires_a_valid_device_credential(): void
    {
        $this->getJson('/api/v1/device/kiosk-media')->assertUnauthorized();
    }
}
