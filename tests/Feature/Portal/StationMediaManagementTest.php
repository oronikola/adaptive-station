<?php

namespace Tests\Feature\Portal;

use App\Enums\StationStatus;
use App\Enums\UserRole;
use App\Models\KioskMedia;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Covers uploading/managing kiosk idle-screen media from a school's own
 * portal — Portal\StationController's media actions. See KioskMediaPolicy
 * for who's allowed: tenant_admin/tenant_operator/platform_super_admin, not
 * adaptivestation_admin (that role is read-only oversight, deliberately
 * excluded from a real content-management action).
 */
class StationMediaManagementTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_a_tenant_admin_can_upload_an_image_to_their_own_station(): void
    {
        Storage::fake('r2');
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->image('welcome.jpg', 800, 600)->size(500);

        $this->actingAs($admin)
            ->post(route('portal.stations.media.store', $station), ['file' => $file, 'duration_seconds' => 10])
            ->assertRedirect(route('portal.stations.show', $station));

        $media = KioskMedia::where('station_id', $station->id)->sole();
        $this->assertSame('image', $media->type->value);
        $this->assertSame(10, $media->duration_seconds);
        $this->assertTrue($media->is_active);
        Storage::disk('r2')->assertExists($media->disk_path);
    }

    public function test_a_tenant_operator_can_also_upload_media(): void
    {
        Storage::fake('r2');
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->create('promo.mp4', 2000, 'video/mp4');

        $this->actingAs($operator)
            ->post(route('portal.stations.media.store', $station), ['file' => $file])
            ->assertRedirect();

        $this->assertSame(1, KioskMedia::where('station_id', $station->id)->count());
    }

    /**
     * The request layer only enforces one blanket ceiling ('max:102400',
     * 100MB) regardless of file type, so a 15MB image passes it — this
     * exercises the model's own finer per-type cap
     * (KioskMediaType::Image->maxSizeKb() = 10MB) that the request rule
     * alone can't express.
     */
    public function test_an_oversized_image_is_rejected_by_the_per_type_limit(): void
    {
        Storage::fake('r2');
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->create('big.jpg', 15 * 1024, 'image/jpeg');

        $response = $this->actingAs($admin)
            ->from(route('portal.stations.show', $station))
            ->post(route('portal.stations.media.store', $station), ['file' => $file]);

        $response->assertSessionHasErrors('file');
        $this->assertSame(0, KioskMedia::where('station_id', $station->id)->count());
    }

    public function test_a_video_over_the_blanket_request_ceiling_is_rejected(): void
    {
        Storage::fake('r2');
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->create('big.mp4', 105 * 1024, 'video/mp4');

        $response = $this->actingAs($admin)
            ->from(route('portal.stations.show', $station))
            ->post(route('portal.stations.media.store', $station), ['file' => $file]);

        $response->assertSessionHasErrors('file');
        $this->assertSame(0, KioskMedia::where('station_id', $station->id)->count());
    }

    public function test_a_tenant_cannot_upload_media_to_another_schools_station(): void
    {
        Storage::fake('r2');
        $tenant = Tenant::factory()->create();
        $other = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $foreignStation = Station::factory()->for($other)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->image('x.jpg');

        $this->actingAs($admin)
            ->post(route('portal.stations.media.store', $foreignStation), ['file' => $file])
            ->assertNotFound();
    }

    public function test_reordering_swaps_two_media_items_and_normalizes_duplicate_positions(): void
    {
        Storage::fake('r2');
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $firstMedia = KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'image', 'disk_path' => 'first.png', 'position' => 1, 'is_active' => true]);
        $secondMedia = KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'image', 'disk_path' => 'second.png', 'position' => 1, 'is_active' => true]);

        $this->actingAs($admin)
            ->patch(route('portal.stations.media.update', [$station, $firstMedia]), ['swap_with' => $secondMedia->id, 'is_active' => false])
            ->assertRedirect();

        $firstMedia->refresh();
        $secondMedia->refresh();
        $this->assertSame(2, $firstMedia->position);
        $this->assertFalse($firstMedia->is_active);
        $this->assertSame(1, $secondMedia->position);
    }

    public function test_a_tenant_operator_can_reorder_media_for_their_station(): void
    {
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $firstMedia = KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'image', 'disk_path' => 'first.png', 'position' => 1, 'is_active' => true]);
        $secondMedia = KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'image', 'disk_path' => 'second.png', 'position' => 2, 'is_active' => true]);

        $this->actingAs($operator)
            ->patch(route('portal.stations.media.update', [$station, $secondMedia]), ['swap_with' => $firstMedia->id])
            ->assertRedirect();

        $firstMedia->refresh();
        $secondMedia->refresh();
        $this->assertSame(2, $firstMedia->position);
        $this->assertSame(1, $secondMedia->position);
    }

    public function test_deleting_media_removes_it_from_the_disk_and_the_database(): void
    {
        Storage::fake('r2');
        Storage::disk('r2')->put('kiosk-media/gone.png', 'fake-bytes');
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $media = KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'image', 'disk_path' => 'kiosk-media/gone.png', 'position' => 0, 'is_active' => true]);

        $this->actingAs($admin)
            ->delete(route('portal.stations.media.destroy', [$station, $media]))
            ->assertRedirect();

        $this->assertDatabaseMissing('kiosk_media', ['id' => $media->id], 'tenant');
        Storage::disk('r2')->assertMissing('kiosk-media/gone.png');
    }

    /** adaptivestation_admin is read-only oversight — never allowed to manage kiosk media, even for a school it's currently viewing. */
    public function test_an_adaptivestation_admin_cannot_upload_media(): void
    {
        Storage::fake('r2');
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $oversight = User::factory()->create(['role' => UserRole::AdaptivestationAdmin, 'tenant_id' => null]);
        $this->withSession(['oversight_tenant_id' => $tenant->id]);
        $file = UploadedFile::fake()->image('x.jpg');

        $this->actingAs($oversight)
            ->post(route('portal.stations.media.store', $station), ['file' => $file])
            ->assertForbidden();
    }
}
