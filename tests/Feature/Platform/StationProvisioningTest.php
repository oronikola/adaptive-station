<?php

namespace Tests\Feature\Platform;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StationProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_create_a_station_and_issue_an_activation_code_that_activates(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $storeResponse = $this->actingAs($platformAdmin)->post(route('platform.stations.store'), [
            'tenant_id' => $tenant->id,
            'name' => 'Main Gate',
            'station_code' => 'STN-0001',
        ]);
        $storeResponse->assertRedirect(route('platform.stations.index'));

        $station = Station::allTenants()->where('station_code', 'STN-0001')->firstOrFail();
        $this->assertSame(StationStatus::PendingActivation, $station->status);
        $this->assertDatabaseHas('master_data_changes', [
            'entity_id' => $station->id,
            'entity_type' => 'station_config',
            'operation' => 'upsert',
        ], 'tenant');

        $issueResponse = $this->actingAs($platformAdmin)
            ->post(route('platform.stations.activation-code', $station->id), ['tenant_id' => $tenant->id]);
        $issueResponse->assertRedirect(route('platform.stations.index'));
        $issueResponse->assertSessionHas('activationCode');

        $code = session('activationCode');

        $this->postJson('/api/v1/device/activate', ['activation_code' => $code])
            ->assertCreated();

        $this->assertSame(StationStatus::Active, $station->fresh()->status);
    }

    public function test_station_code_must_be_unique_per_tenant(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        Station::factory()->for($tenant)->create(['station_code' => 'DUP-01']);

        $this->actingAs($platformAdmin)->post(route('platform.stations.store'), [
            'tenant_id' => $tenant->id,
            'name' => 'Another',
            'station_code' => 'DUP-01',
        ])->assertSessionHasErrors('station_code');
    }

    public function test_the_same_station_code_is_allowed_across_two_different_tenants(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        Station::factory()->for($tenantA)->create(['station_code' => 'SHARED-01']);

        $this->actingAs($platformAdmin)->post(route('platform.stations.store'), [
            'tenant_id' => $tenantB->id,
            'name' => 'Some Station',
            'station_code' => 'SHARED-01',
        ])->assertSessionHasNoErrors();
    }
}
