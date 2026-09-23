<?php

namespace App\Support;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\SmsGatewayDeviceSimStatus;
use App\Models\SmsOutboxMessage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;

/**
 * The fleet roster + backlog view shared by Platform\SmsGatewayDeviceController
 * (full manage access) and Portal\SmsGatewayFleetController (read-only, for
 * adaptivestation_admin) — kept in one place so the two screens can never
 * silently drift apart on what a device row or the backlog actually contains.
 */
class SmsGatewayFleetSnapshot
{
    /**
     * @return array{devices: Collection, backlog: array}
     */
    public static function build(): array
    {
        $staleThreshold = Date::now()->subMinutes((int) config('device.sms_gateway_offline_threshold_minutes'));

        // Yesterday's (or older) row isn't rolled over until this device's
        // next write to it (see SmsGatewayDeviceSimStat::incrementFor()) —
        // filtering to today's stats_date here avoids displaying stale
        // counts as if they were today's.
        $today = SmsGatewayDevice::currentStatsDate();

        // How many *distinct* SIM slots each device has ever actually sent
        // from, all-time (not scoped to today) — a row only exists here once
        // a real send has been tagged with that slot, so this reflects which
        // SIMs are genuinely reachable through this device, not just how
        // many are physically inserted. Used to size the device-level cap
        // dynamically (see SmsGatewayDevice::aggregateDailySendCap()).
        $simSlotCounts = SmsGatewayDeviceSimStat::query()
            ->selectRaw('device_id, count(distinct sim_slot) as slot_count')
            ->groupBy('device_id')
            ->pluck('slot_count', 'device_id');

        $devices = SmsGatewayDevice::query()
            ->with([
                'simStats' => fn ($query) => $query->where('stats_date', $today),
                'simStatuses' => fn ($query) => $query->orderBy('sim_slot'),
            ])
            ->orderBy('label')
            ->get()
            ->map(function (SmsGatewayDevice $device) use ($today, $staleThreshold, $simSlotCounts) {
                $simSlotCount = (int) ($simSlotCounts[$device->id] ?? 0);
                $deviceCap = SmsGatewayDevice::aggregateDailySendCap($simSlotCount);

                return [
                    'id' => $device->id,
                    'label' => $device->label,
                    'username' => $device->username,
                    'is_active' => $device->is_active,
                    'last_seen_at' => $device->last_seen_at?->toIso8601String(),
                    'sent_today' => $device->stats_date?->toDateString() === $today ? $device->sent_today : 0,
                    'delivered_today' => $device->stats_date?->toDateString() === $today ? $device->delivered_today : 0,
                    'failed_today' => $device->stats_date?->toDateString() === $today ? $device->failed_today : 0,
                    'is_stale' => $device->last_seen_at === null || $device->last_seen_at->lt($staleThreshold),
                    // Per-SIM cap — what each SIM badge is measured against.
                    'daily_send_cap' => config('services.sms_gateway.daily_send_cap'),
                    // The device row's own total is every SIM it actually
                    // sends from combined, so it's measured against the cap
                    // times however many distinct SIM slots this device has
                    // ever sent from (see SmsGatewayDevice::
                    // aggregateDailySendCap()'s docblock) — otherwise a
                    // healthy multi-SIM phone reads as "over cap" once its
                    // SIMs' sends add up past the single-SIM figure, and a
                    // default-SIM-mode phone (only ever 1 reachable slot)
                    // gets an inflated cap it could never legitimately fill.
                    'device_daily_send_cap' => $deviceCap,
                    'cap_status' => SmsGatewayDevice::capStatusFor(
                        $device->stats_date?->toDateString() === $today ? $device->sent_today : 0,
                        $deviceCap,
                    ),
                    // Only shown once this device has reported sends from
                    // *more than one* distinct SIM slot — a device with only
                    // one reachable slot (a single physical SIM, or one
                    // running in the mobile app's "default SIM" mode, where
                    // individual sends aren't tagged to a slot at all) has
                    // nothing meaningful to split its total by, and a stray
                    // one-off tagged row from before that mode was set would
                    // otherwise show a badge like "SIM 1 · 1/450" next to a
                    // device total of 187 — technically accurate (it really
                    // did only tag one send), but reads as broken tracking.
                    'sim_stats' => $simSlotCount > 1
                        ? $device->simStats
                            ->sortBy('sim_slot')
                            ->values()
                            ->map(fn (SmsGatewayDeviceSimStat $stat) => [
                                'sim_slot' => $stat->sim_slot,
                                'sent_today' => $stat->sent_today,
                                'delivered_today' => $stat->delivered_today,
                                'failed_today' => $stat->failed_today,
                                'cap_status' => $stat->capStatus(),
                            ])
                        : collect(),
                    'sim_statuses' => $device->simStatuses
                        ->map(fn (SmsGatewayDeviceSimStatus $status) => [
                            'sim_slot' => $status->sim_slot,
                            'carrier' => $status->carrier,
                            'status' => $status->status,
                            'balance_centavos' => $status->balance_centavos,
                            'source' => $status->source,
                            'checked_at' => $status->checked_at?->toIso8601String(),
                            'last_error' => $status->last_error,
                        ])
                        ->values(),
                ];
            });

        $backlog = [
            'pending' => SmsOutboxMessage::query()->where('status', SmsOutboxStatus::Pending->value)->count(),
            'claimed' => SmsOutboxMessage::query()->where('status', SmsOutboxStatus::Claimed->value)->count(),
            'failed_last_24h' => SmsOutboxMessage::query()
                ->where('status', SmsOutboxStatus::Failed->value)
                ->where('created_at', '>', Date::now()->subDay())
                ->count(),
            'oldest_pending_age_seconds' => static::oldestPendingAgeSeconds(),
        ];

        return ['devices' => $devices, 'backlog' => $backlog];
    }

    private static function oldestPendingAgeSeconds(): int
    {
        $oldest = SmsOutboxMessage::query()
            ->where('status', SmsOutboxStatus::Pending->value)
            ->min('created_at');

        return $oldest === null ? 0 : Date::now()->diffInSeconds(Date::parse($oldest));
    }
}
