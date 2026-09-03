<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\MasterDataEntityType;
use App\Enums\MasterDataOperation;
use App\Enums\StationStatus;
use App\Models\MasterDataChange;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class MasterDataCursorFeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_feed_returns_only_changes_newer_than_the_cursor_in_order(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $entityId = (string) Str::uuid();
        MasterDataChange::record($tenant->id, MasterDataEntityType::Person, $entityId, MasterDataOperation::Upsert);
        MasterDataChange::record($tenant->id, MasterDataEntityType::Person, $entityId, MasterDataOperation::Upsert);
        MasterDataChange::record($tenant->id, MasterDataEntityType::Person, $entityId, MasterDataOperation::Upsert);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/device/master-data?cursor=1');

        $response->assertOk();

        $versions = collect($response->json('changes'))->pluck('version');

        $this->assertSame([2, 3], $versions->all());
        $this->assertSame(3, $response->json('next_cursor'));
        $this->assertFalse($response->json('has_more'));

        $this->assertDatabaseHas('device_sync_cursors', [
            'station_id' => $station->id,
            'master_data_version' => 1,
        ]);
    }

    public function test_an_empty_feed_reports_the_input_cursor_back_unchanged(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/device/master-data?cursor=5');

        $response->assertOk()
            ->assertJson(['changes' => [], 'next_cursor' => 5, 'has_more' => false]);
    }

    /**
     * Regression test: a brand-new station's very first pull ever uses
     * cursor=0, the realistic default for a freshly activated kiosk. This
     * previously crashed with a NOT NULL constraint violation because a
     * freshly-created device_sync_cursors row's in-memory
     * master_data_version attribute was PHP null (not yet reflecting the
     * column's DB-level default), and max(null, 0) resolves to null.
     */
    public function test_a_stations_very_first_pull_with_cursor_zero_succeeds(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/device/master-data?cursor=0');

        $response->assertOk()
            ->assertJson(['changes' => [], 'next_cursor' => 0, 'has_more' => false]);

        $this->assertDatabaseHas('device_sync_cursors', [
            'station_id' => $station->id,
            'master_data_version' => 0,
        ]);
    }
}
