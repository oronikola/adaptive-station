<?php

namespace App\Console\Commands;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\SmsOutboxMessage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Date;

/**
 * One-off correction for counters that drifted before
 * SmsGatewayDeviceSimStat::incrementFor() became atomic — a lost per-SIM
 * increment under concurrent reports left the two SIM totals under-counting
 * the device-level total (e.g. sent_today=580 vs 197+192=389 SIM totals).
 * Recomputes sent_today/delivered_today straight from sms_outbox, the actual
 * source of truth, for the gateway's current stats_date.
 *
 * failed_today is deliberately left untouched: SmsOutboxMessage::markFailed()
 * clears claimed_by_device_id (see its docblock), so a failed message can no
 * longer be attributed back to the device that reported it — there is no
 * reliable source to recompute that counter from after the fact.
 */
class ReconcileSmsGatewayDailyStats extends Command
{
    protected $signature = 'sms:reconcile-daily-stats {--device= : Only reconcile this device ID}';

    protected $description = "Recompute today's sent/delivered counters (device-level and per-SIM) from sms_outbox";

    public function handle(): int
    {
        $today = SmsGatewayDevice::currentStatsDate();
        $timezone = (string) config('services.sms_gateway.timezone');
        $start = Date::parse($today, $timezone)->startOfDay()->utc();
        $end = Date::parse($today, $timezone)->endOfDay()->utc();

        $devices = SmsGatewayDevice::query()
            ->when($this->option('device'), fn ($query, $id) => $query->whereKey($id))
            ->get();

        foreach ($devices as $device) {
            $sent = SmsOutboxMessage::query()
                ->where('claimed_by_device_id', $device->id)
                ->whereIn('status', [SmsOutboxStatus::Sent->value, SmsOutboxStatus::Delivered->value])
                ->whereBetween('sent_at', [$start, $end])
                ->count();

            $delivered = SmsOutboxMessage::query()
                ->where('claimed_by_device_id', $device->id)
                ->where('status', SmsOutboxStatus::Delivered->value)
                ->whereBetween('delivered_at', [$start, $end])
                ->count();

            $device->forceFill([
                'sent_today' => $sent,
                'delivered_today' => $delivered,
                'stats_date' => $today,
            ])->save();

            foreach ([0, 1] as $simSlot) {
                $simSent = SmsOutboxMessage::query()
                    ->where('claimed_by_device_id', $device->id)
                    ->where('sim_slot', $simSlot)
                    ->whereIn('status', [SmsOutboxStatus::Sent->value, SmsOutboxStatus::Delivered->value])
                    ->whereBetween('sent_at', [$start, $end])
                    ->count();

                $simDelivered = SmsOutboxMessage::query()
                    ->where('claimed_by_device_id', $device->id)
                    ->where('sim_slot', $simSlot)
                    ->where('status', SmsOutboxStatus::Delivered->value)
                    ->whereBetween('delivered_at', [$start, $end])
                    ->count();

                $exists = SmsGatewayDeviceSimStat::query()
                    ->where('device_id', $device->id)
                    ->where('sim_slot', $simSlot)
                    ->exists();

                // Never invents a per-SIM row for a device whose app build
                // has never reported one (see SmsGatewayDeviceSimStat's own
                // docblock on "unknown" vs "zero sent").
                if (! $exists && $simSent === 0 && $simDelivered === 0) {
                    continue;
                }

                SmsGatewayDeviceSimStat::query()->updateOrCreate(
                    ['device_id' => $device->id, 'sim_slot' => $simSlot],
                    ['sent_today' => $simSent, 'delivered_today' => $simDelivered, 'stats_date' => $today],
                );
            }

            $this->info("{$device->label}: sent_today={$sent}, delivered_today={$delivered}");
        }

        return self::SUCCESS;
    }
}
