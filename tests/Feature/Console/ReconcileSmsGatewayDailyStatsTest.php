<?php

namespace Tests\Feature\Console;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Covers app\Console\Commands\ReconcileSmsGatewayDailyStats — the one-off
 * correction for counters that drifted before SmsGatewayDeviceSimStat::
 * incrementFor() became atomic (see its docblock).
 */
class ReconcileSmsGatewayDailyStatsTest extends TestCase
{
    use RefreshDatabase;

    private function makeSentRow(Tenant $tenant, SmsGatewayDevice $device, ?int $simSlot, string $sentAt): SmsOutboxMessage
    {
        $row = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639171234567',
            'message' => 'Test tapped IN at 8:00 AM',
            'status' => SmsOutboxStatus::Sent,
            'claimed_by_device_id' => $device->id,
            'sim_slot' => $simSlot,
            'expires_at' => Date::parse($sentAt)->addMinutes(30),
        ]);

        // sent_at isn't mass-assignable (see the model's Fillable list) —
        // it's only ever set via markSent()'s forceFill(), so tests that
        // need a specific value must do the same.
        $row->forceFill(['sent_at' => Date::parse($sentAt)])->save();

        return $row;
    }

    public function test_it_recomputes_inflated_device_and_sim_totals_from_the_outbox(): void
    {
        config(['services.sms_gateway.timezone' => 'Asia/Manila']);
        $this->travelTo('2026-09-23 05:00:00'); // 2026-09-23 13:00 in Asia/Manila
        $tenant = Tenant::factory()->create();
        $device = SmsGatewayDevice::create(['label' => 'Phone04']);

        // Simulate the drift: the device-level aggregate raced ahead of the
        // true per-SIM totals before the atomicity fix.
        $device->forceFill(['sent_today' => 580, 'stats_date' => '2026-09-23'])->save();
        SmsGatewayDeviceSimStat::create(['device_id' => $device->id, 'sim_slot' => 0, 'sent_today' => 197, 'stats_date' => '2026-09-23']);
        SmsGatewayDeviceSimStat::create(['device_id' => $device->id, 'sim_slot' => 1, 'sent_today' => 192, 'stats_date' => '2026-09-23']);

        // The actual sms_outbox rows: 3 sent today on SIM 0, 2 on SIM 1.
        $this->makeSentRow($tenant, $device, 0, '2026-09-23 05:01:00');
        $this->makeSentRow($tenant, $device, 0, '2026-09-23 05:02:00');
        $this->makeSentRow($tenant, $device, 0, '2026-09-23 05:03:00');
        $this->makeSentRow($tenant, $device, 1, '2026-09-23 05:04:00');
        $this->makeSentRow($tenant, $device, 1, '2026-09-23 05:05:00');
        // A different day's send must not be counted.
        $this->makeSentRow($tenant, $device, 0, '2026-09-22 05:01:00');

        Artisan::call('sms:reconcile-daily-stats');

        $this->assertSame(5, $device->fresh()->sent_today);
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', ['device_id' => $device->id, 'sim_slot' => 0, 'sent_today' => 3]);
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', ['device_id' => $device->id, 'sim_slot' => 1, 'sent_today' => 2]);
    }

    public function test_the_device_option_scopes_the_reconciliation_to_one_device(): void
    {
        $tenant = Tenant::factory()->create();
        $target = SmsGatewayDevice::create(['label' => 'Phone A']);
        $other = SmsGatewayDevice::create(['label' => 'Phone B']);
        $target->forceFill(['sent_today' => 99, 'stats_date' => SmsGatewayDevice::currentStatsDate()])->save();
        $other->forceFill(['sent_today' => 99, 'stats_date' => SmsGatewayDevice::currentStatsDate()])->save();

        Artisan::call('sms:reconcile-daily-stats', ['--device' => $target->id]);

        $this->assertSame(0, $target->fresh()->sent_today);
        $this->assertSame(99, $other->fresh()->sent_today);
    }
}
