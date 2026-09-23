<?php

namespace Tests\Feature\Platform;

use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class SmsGatewayFleetCapTest extends TestCase
{
    use RefreshDatabase;

    private function deviceWithSentToday(int $sentToday): SmsGatewayDevice
    {
        // sent_today isn't in the model's Fillable list (it's only ever
        // written via increment()/resetDailyStatsIfNeeded()), so create()
        // silently drops it — forceFill() is required to seed it directly.
        $device = SmsGatewayDevice::create(['label' => 'Phone 01']);
        $device->forceFill([
            'sent_today' => $sentToday,
            'stats_date' => SmsGatewayDevice::currentStatsDate(),
        ])->save();

        return $device;
    }

    /** Marks a device as having actually sent from each of the given SIM slots at some point (all-time, not just today) — see SmsGatewayFleetSnapshot::build()'s $simSlotCounts. */
    private function markSimSlotsUsed(SmsGatewayDevice $device, array $slots): void
    {
        foreach ($slots as $slot) {
            SmsGatewayDeviceSimStat::create([
                'device_id' => $device->id,
                'sim_slot' => $slot,
                'sent_today' => 1,
                'stats_date' => Date::now()->subDays(30)->toDateString(),
            ]);
        }
    }

    public function test_a_device_well_under_its_daily_cap_shows_as_ok(): void
    {
        config(['services.sms_gateway.daily_send_cap' => 450]);
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $this->deviceWithSentToday(10);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('devices.0.cap_status', 'ok')
            ->where('devices.0.daily_send_cap', 450)
            // Never having reported a sim_slot at all (a device sending in
            // "default SIM" mode — see SmsGatewayDevice::
            // aggregateDailySendCap()'s docblock) falls back to a single
            // reachable slot, not an assumed dual-SIM figure.
            ->where('devices.0.device_daily_send_cap', 450));
    }

    public function test_a_dual_sim_device_is_capped_at_double_the_per_sim_figure(): void
    {
        config(['services.sms_gateway.daily_send_cap' => 450]);
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $device = $this->deviceWithSentToday(10);
        $this->markSimSlotsUsed($device, [0, 1]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page->where('devices.0.device_daily_send_cap', 900));
    }

    public function test_a_single_sim_device_is_flagged_at_the_single_sim_figure_not_double(): void
    {
        config(['services.sms_gateway.daily_send_cap' => 450]);
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        // A device that has only ever reported sending from slot 0 — e.g. a
        // phone running in "default SIM" mode, or one with only one SIM
        // physically installed.
        $device = $this->deviceWithSentToday(460);
        $this->markSimSlotsUsed($device, [0]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('devices.0.device_daily_send_cap', 450)
            ->where('devices.0.cap_status', 'at'));
    }

    public function test_a_single_slot_devices_stray_sim_stat_is_not_shown_as_a_misleading_badge(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $device = $this->deviceWithSentToday(187);
        // Only one tagged send, ever, even though the device sent 187 —
        // exactly the "default SIM mode" shape: nothing meaningful to split
        // the 187 by, so the per-SIM badge should not appear at all.
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 1,
            'stats_date' => Date::now()->toDateString(),
        ]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('devices.0.sent_today', 187)
            ->where('devices.0.sim_stats', []));
    }

    public function test_a_device_near_its_daily_cap_is_flagged(): void
    {
        config(['services.sms_gateway.daily_send_cap' => 450]);
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $device = $this->deviceWithSentToday(760); // >=80% of the 900 combined (2x450) cap
        $this->markSimSlotsUsed($device, [0, 1]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page->where('devices.0.cap_status', 'near'));
    }

    public function test_a_device_at_its_daily_cap_is_flagged(): void
    {
        config(['services.sms_gateway.daily_send_cap' => 450]);
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $device = $this->deviceWithSentToday(900); // the combined (2x450) cap, not the per-SIM figure
        $this->markSimSlotsUsed($device, [0, 1]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page->where('devices.0.cap_status', 'at'));
    }

    public function test_per_sim_stats_show_up_once_reported(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $device = SmsGatewayDevice::create(['label' => 'Phone 01']);
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

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('devices.0.sim_stats.0.sim_slot', 0)
            ->where('devices.0.sim_stats.0.sent_today', 120)
            ->where('devices.0.sim_stats.1.sim_slot', 1)
            ->where('devices.0.sim_stats.1.sent_today', 90));
    }

    public function test_a_device_with_no_sim_reports_yet_has_an_empty_sim_stats_list(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        SmsGatewayDevice::create(['label' => 'Phone 01']);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page->where('devices.0.sim_stats', []));
    }

    public function test_yesterdays_sim_stats_are_not_shown_as_todays(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $device = SmsGatewayDevice::create(['label' => 'Phone 01']);
        // A second, today-dated slot keeps this a genuine dual-SIM device
        // (simSlotCount > 1), so the sim_stats list isn't empty simply
        // because there's nothing meaningful to show (see
        // SmsGatewayFleetSnapshot::build()'s docblock on that gate) — this
        // test is specifically about the date filter, not the slot-count one.
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 400,
            'stats_date' => Date::now()->subDay()->toDateString(),
        ]);
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 1,
            'sent_today' => 50,
            'stats_date' => Date::now()->toDateString(),
        ]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page
            ->has('devices.0.sim_stats', 1)
            ->where('devices.0.sim_stats.0.sim_slot', 1));
    }

    public function test_yesterdays_device_totals_are_zero_after_midnight_in_the_gateway_timezone(): void
    {
        config([
            'services.sms_gateway.daily_send_cap' => 450,
            'services.sms_gateway.timezone' => 'Asia/Manila',
        ]);
        $this->travelTo('2026-09-16 16:30:00');
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $device = SmsGatewayDevice::create(['label' => 'Phone 01']);
        $device->forceFill([
            'sent_today' => 450,
            'delivered_today' => 440,
            'failed_today' => 10,
            'stats_date' => '2026-09-16',
        ])->save();

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('devices.0.sent_today', 0)
            ->where('devices.0.delivered_today', 0)
            ->where('devices.0.failed_today', 0)
            ->where('devices.0.cap_status', 'ok'));
    }
}
