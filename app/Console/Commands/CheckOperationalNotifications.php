<?php

namespace App\Console\Commands;

use App\Enums\SmsOutboxStatus;
use App\Enums\StationStatus;
use App\Enums\TenantStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\Tenant;
use App\Services\WebNotificationService;
use App\Support\TenantDatabase;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

#[Signature('notifications:check-operational')]
#[Description('Create web notifications for station, SMS gateway, and delivery incidents')]
class CheckOperationalNotifications extends Command
{
    public function handle(WebNotificationService $notifications): int
    {
        $this->checkStations($notifications);
        $this->checkGateways($notifications);
        $this->checkSmsBacklog($notifications);
        $this->checkSmsFailures($notifications);

        return self::SUCCESS;
    }

    private function checkStations(WebNotificationService $notifications): void
    {
        $cutoff = Date::now()->subMinutes((int) config('device.station_offline_threshold_minutes'));
        $stations = collect();
        foreach (Tenant::query()->where('status', TenantStatus::Active)->get() as $tenant) {
            TenantDatabase::use($tenant);
            Station::allTenants()
                ->where('status', StationStatus::Active)
                ->get()
                ->each(function (Station $station) use ($stations, $tenant): void {
                    $station->setRelation('tenant', $tenant);
                    $stations->push($station);
                });
        }
        $observedKeys = [];

        foreach ($stations as $station) {
            $key = 'station:'.$station->id.':offline';
            $observedKeys[] = $key;
            $isOffline = $station->last_seen_at === null || $station->last_seen_at->lte($cutoff);
            $transition = $this->transition($key, 'station_offline', $isOffline, $station->tenant_id, [
                'station_id' => $station->id,
            ]);

            if ($transition === 'activated') {
                $notifications->notifyStationOffline($station);
            } elseif ($transition === 'resolved') {
                $notifications->notifyStationRecovered($station);
            }
        }

        $this->resolveUnobserved('station_offline', $observedKeys);
    }

    private function checkGateways(WebNotificationService $notifications): void
    {
        $cutoff = Date::now()->subMinutes((int) config('device.sms_gateway_offline_threshold_minutes'));
        $devices = SmsGatewayDevice::query()->where('is_active', true)->get();
        $observedKeys = [];

        foreach ($devices as $device) {
            $key = 'sms-gateway:'.$device->id.':offline';
            $observedKeys[] = $key;
            $isOffline = $device->last_seen_at === null || $device->last_seen_at->lte($cutoff);
            $transition = $this->transition($key, 'gateway_offline', $isOffline, context: [
                'device_id' => $device->id,
            ]);

            if ($transition === 'activated') {
                $notifications->notifyGatewayOffline($device->label);
            } elseif ($transition === 'resolved') {
                $notifications->notifyGatewayRecovered($device->label);
            }
        }

        $this->resolveUnobserved('gateway_offline', $observedKeys);
    }

    private function checkSmsBacklog(WebNotificationService $notifications): void
    {
        $pending = SmsOutboxMessage::query()->where('status', SmsOutboxStatus::Pending);
        $pendingCount = (clone $pending)->count();
        $oldestCreatedAt = (clone $pending)->min('created_at');
        $ageMinutes = $oldestCreatedAt === null
            ? 0
            : (int) Date::parse($oldestCreatedAt)->diffInMinutes(Date::now());
        $isDelayed = $pendingCount > 0
            && $ageMinutes >= (int) config('device.sms_backlog_alert_threshold_minutes');
        $transition = $this->transition('sms:backlog:delayed', 'sms_backlog_delayed', $isDelayed, context: [
            'pending_count' => $pendingCount,
            'oldest_age_minutes' => $ageMinutes,
        ]);

        if ($transition === 'activated') {
            $notifications->notifySmsBacklogDelayed($pendingCount, $ageMinutes);
        } elseif ($transition === 'resolved') {
            $notifications->notifySmsBacklogRecovered();
        }
    }

    private function checkSmsFailures(WebNotificationService $notifications): void
    {
        $failureCount = SmsOutboxMessage::query()
            ->where('status', SmsOutboxStatus::Failed)
            ->where('created_at', '>', Date::now()->subDay())
            ->count();
        $transition = $this->transition('sms:delivery:failed', 'sms_delivery_failed', $failureCount > 0, context: [
            'failure_count' => $failureCount,
        ]);

        if ($transition === 'activated') {
            $notifications->notifySmsFailures($failureCount);
        }
    }

    /** @param array<string, mixed> $context */
    private function transition(
        string $key,
        string $category,
        bool $isActive,
        ?string $tenantId = null,
        array $context = [],
    ): ?string {
        return DB::connection('mysql')->transaction(function () use ($key, $category, $isActive, $tenantId, $context): ?string {
            $state = DB::connection('mysql')->table('operational_alert_states')
                ->where('key', $key)
                ->lockForUpdate()
                ->first();

            if ($state === null) {
                if (! $isActive) {
                    return null;
                }

                DB::connection('mysql')->table('operational_alert_states')->insert([
                    'key' => $key,
                    'category' => $category,
                    'tenant_id' => $tenantId,
                    'is_active' => true,
                    'context' => json_encode($context, JSON_THROW_ON_ERROR),
                    'activated_at' => Date::now(),
                    'created_at' => Date::now(),
                    'updated_at' => Date::now(),
                ]);

                return 'activated';
            }

            if ((bool) $state->is_active === $isActive) {
                return null;
            }

            DB::connection('mysql')->table('operational_alert_states')
                ->where('key', $key)
                ->update([
                    'is_active' => $isActive,
                    'context' => json_encode($context, JSON_THROW_ON_ERROR),
                    'activated_at' => $isActive ? Date::now() : $state->activated_at,
                    'resolved_at' => $isActive ? null : Date::now(),
                    'updated_at' => Date::now(),
                ]);

            return $isActive ? 'activated' : 'resolved';
        });
    }

    /** @param list<string> $observedKeys */
    private function resolveUnobserved(string $category, array $observedKeys): void
    {
        DB::connection('mysql')->table('operational_alert_states')
            ->where('category', $category)
            ->where('is_active', true)
            ->when($observedKeys !== [], fn ($query) => $query->whereNotIn('key', $observedKeys))
            ->update([
                'is_active' => false,
                'resolved_at' => Date::now(),
                'updated_at' => Date::now(),
            ]);
    }
}
