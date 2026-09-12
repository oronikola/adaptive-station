<?php

namespace App\Support;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
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
        $staleThreshold = Date::now()->subMinutes(3);

        // Yesterday's (or older) row isn't rolled over until this device's
        // next write to it (see SmsGatewayDeviceSimStat::incrementFor()) —
        // filtering to today's stats_date here avoids displaying stale
        // counts as if they were today's.
        $today = Date::now()->toDateString();

        $devices = SmsGatewayDevice::query()
            ->with(['simStats' => fn ($query) => $query->where('stats_date', $today)])
            ->orderBy('label')
            ->get()
            ->map(fn (SmsGatewayDevice $device) => [
                'id' => $device->id,
                'label' => $device->label,
                'username' => $device->username,
                'is_active' => $device->is_active,
                'last_seen_at' => $device->last_seen_at?->toIso8601String(),
                'sent_today' => $device->sent_today,
                'delivered_today' => $device->delivered_today,
                'failed_today' => $device->failed_today,
                'is_stale' => $device->last_seen_at === null || $device->last_seen_at->lt($staleThreshold),
                'daily_send_cap' => config('services.sms_gateway.daily_send_cap'),
                'cap_status' => $device->dailySendCapStatus(),
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
