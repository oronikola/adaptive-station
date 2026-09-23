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

        $devices = SmsGatewayDevice::query()
            ->with([
                'simStats' => fn ($query) => $query->where('stats_date', $today),
                'simStatuses' => fn ($query) => $query->orderBy('sim_slot'),
            ])
            ->orderBy('label')
            ->get()
            ->map(fn (SmsGatewayDevice $device) => [
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
                // The device row's own total is both SIMs combined, so it's
                // measured against double the per-SIM cap (see
                // SmsGatewayDevice::aggregateDailySendCap()'s docblock) —
                // otherwise a healthy dual-SIM phone reads as "over cap"
                // once its two SIMs' sends add up past the single-SIM figure.
                'device_daily_send_cap' => SmsGatewayDevice::aggregateDailySendCap(),
                'cap_status' => SmsGatewayDevice::capStatusFor(
                    $device->stats_date?->toDateString() === $today ? $device->sent_today : 0,
                    SmsGatewayDevice::aggregateDailySendCap(),
                ),
                // Only present once this device's app build has reported at
                // least one sim_slot-tagged send — an older, not-yet-updated
                // phone has no rows here yet, so the fleet screen shows
                // "not reported" for it rather than a misleading zero.
                'sim_stats' => $device->simStats
                    ->sortBy('sim_slot')
                    ->values()
                    ->map(fn (SmsGatewayDeviceSimStat $stat) => [
                        'sim_slot' => $stat->sim_slot,
                        'sent_today' => $stat->sent_today,
                        'delivered_today' => $stat->delivered_today,
                        'failed_today' => $stat->failed_today,
                        'cap_status' => $stat->capStatus(),
                    ]),
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
            ]);

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
