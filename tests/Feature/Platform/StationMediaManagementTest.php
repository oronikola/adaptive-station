<?php

namespace Tests\Feature\Platform;

use App\Enums\StationStatus;
use App\Models\KioskMedia;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Covers a superadmin uploading/managing kiosk media for any school's
 * station from the Platform side — see Platform\StationController's media
 * actions. Every route needs tenant_id, the same "which physical database"
 * disambiguation every other Platform station mutation already requires
 * (see StationController::resolveStation()'s docblock).
 */
class StationMediaManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_platform_super_admin_can_upload_media_to_any_schools_station(): void
    {
        Storage::fake('r2');
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->image('slide.png');

        $this->actingAs($platformAdmin)
            ->post(route('platform.stations.media.store', $station->id), ['file' => $file, 'tenant_id' => $tenant->id])
            ->assertRedirect();

        $media = KioskMedia::allTenants()->where('station_id', $station->id)->sole();
        $this->assertSame('image', $media->type->value);
    }

    public function test_media_assigned_to_one_station_never_appears_on_another_even_at_the_same_school(): void
    {
        Storage::fake('r2');
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $stationA = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $stationB = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->image('slide.png');

        $this->actingAs($platformAdmin)
            ->post(route('platform.stations.media.store', $stationA->id), ['file' => $file, 'tenant_id' => $tenant->id])
            ->assertRedirect();

        $this->assertSame(1, KioskMedia::allTenants()->where('station_id', $stationA->id)->count());
        $this->assertSame(0, KioskMedia::allTenants()->where('station_id', $stationB->id)->count());
    }

    /**
     * Regression test: the upload itself is a plain create(), unaffected by
     * TenantScope, so it can succeed while the page that's supposed to show
     * the result comes back empty if that read goes through a scoped query
     * instead of allTenants() — see StationController::serializeMedia()'s
     * docblock. The earlier upload test only checked the database row
     * existed; this checks the Inertia response the admin actually sees.
     */
    public function test_uploaded_media_appears_in_the_stations_page_response(): void
    {
        Storage::fake('r2');
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->image('slide.png');

        $this->actingAs($platformAdmin)
            ->post(route('platform.stations.media.store', $station->id), ['file' => $file, 'tenant_id' => $tenant->id])
            ->assertRedirect();

        $this->actingAs($platformAdmin)
            ->get(route('platform.stations.show', ['station' => $station->id, 'tenant_id' => $tenant->id]))
            ->assertInertia(fn ($page) => $page
                ->where('media.0.type', 'image')
                ->has('media', 1));
    }

    public function test_a_tenant_admin_cannot_reach_the_platform_media_routes(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $file = UploadedFile::fake()->image('slide.png');

        $this->actingAs($admin)
            ->post(route('platform.stations.media.store', $station->id), ['file' => $file, 'tenant_id' => $tenant->id])
            ->assertForbidden();
    }

    public function test_deleting_media_from_the_platform_side_purges_the_disk_object(): void
    {
        Storage::fake('r2');
        Storage::disk('r2')->put('kiosk-media/gone.png', 'fake-bytes');
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $media = KioskMedia::create(['tenant_id' => $tenant->id, 'station_id' => $station->id, 'type' => 'image', 'disk_path' => 'kiosk-media/gone.png', 'position' => 0, 'is_active' => true]);

        $this->actingAs($platformAdmin)
            ->delete(route('platform.stations.media.destroy', [$station->id, $media->id]), ['tenant_id' => $tenant->id])
            ->assertRedirect();

        $this->assertDatabaseMissing('kiosk_media', ['id' => $media->id], 'tenant');
        Storage::disk('r2')->assertMissing('kiosk-media/gone.png');
    }
}
