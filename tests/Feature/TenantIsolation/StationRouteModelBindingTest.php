<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class StationRouteModelBindingTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_tenant_user_cannot_fetch_another_tenants_station_via_route_model_binding(): void
    {
        Route::middleware('web')->get('/__test/stations/{station}', fn (Station $station) => response()->json(['id' => $station->id]));

        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $stationB = Station::factory()->for($tenantB)->create();

        // Uses tenant B's real station_code (not a random/garbage value) so
        // this actually proves cross-tenant denial via the tenant scope,
        // not just that an unrelated UUID never matches a station_code.
        $response = $this->actingAs($adminA)->get("/__test/stations/{$stationB->station_code}");

        $response->assertNotFound();
    }

    public function test_a_tenant_user_can_fetch_their_own_tenants_station_via_route_model_binding(): void
    {
        Route::middleware('web')->get('/__test/stations/{station}', fn (Station $station) => response()->json(['id' => $station->id]));

        $tenantA = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $stationA = Station::factory()->for($tenantA)->create();

        // Station's route key is station_code, not id (see the portal URL
        // slug change) — route model binding resolves on that column now.
        $response = $this->actingAs($adminA)->get("/__test/stations/{$stationA->station_code}");

        $response->assertOk()->assertJson(['id' => $stationA->id]);
    }
}
