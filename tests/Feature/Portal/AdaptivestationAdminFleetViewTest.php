<?php

namespace Tests\Feature\Portal;

use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

/**
 * adaptivestation_admin gets a read-only mirror of the Platform SMS Gateway
 * Fleet screen (see Portal\SmsGatewayFleetController) — same data (the
 * fleet is shared across every school, not owned by whichever one is
 * selected), no manage actions.
 */
class AdaptivestationAdminFleetViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_view_the_fleet_including_per_sim_stats(): void
    {
        $admin = User::factory()->adaptivestationAdmin()->create();
        $device = SmsGatewayDevice::create(['label' => 'Phone 01']);
        // A per-SIM breakdown is only shown for a device with more than one
        // reachable SIM slot (see SmsGatewayFleetSnapshot::build()'s
        // docblock) — a second slot keeps this a genuine dual-SIM device.
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 120,
            'stats_date' => Date::now()->toDateString(),
        ]);
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 1,
            'sent_today' => 90,
            'stats_date' => Date::now()->toDateString(),
        ]);

        $response = $this->actingAs($admin)->get(route('portal.sms-gateway.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('devices.0.label', 'Phone 01')
            ->where('devices.0.sim_stats.0.sim_slot', 0)
            ->where('devices.0.sim_stats.0.sent_today', 120));
    }

    public function test_it_does_not_need_a_school_selected_since_the_fleet_is_shared(): void
    {
        // Deliberately does NOT call actingForSchool()-equivalent selection
        // — the fleet screen must not require (or care about) a selected
        // school, unlike portal.sms-log.index.
        $admin = User::factory()->adaptivestationAdmin()->create();
        SmsGatewayDevice::create(['label' => 'Phone 01']);

        $this->actingAs($admin)->get(route('portal.sms-gateway.index'))->assertOk();
    }

    public function test_a_tenant_admin_cannot_view_the_fleet(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($tenantAdmin)->get(route('portal.sms-gateway.index'))->assertForbidden();
    }
}
