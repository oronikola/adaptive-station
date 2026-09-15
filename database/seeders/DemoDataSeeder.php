<?php

namespace Database\Seeders;

use App\Enums\AuditActorType;
use App\Enums\SmsOutboxStatus;
use App\Enums\StationStatus;
use App\Enums\TenantStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantDatabase;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    /** @var array<int, array{name: string, code: string, status: TenantStatus}> */
    private const CLIENTS = [
        ['name' => 'Ateneo Learning Center', 'code' => 'demo-ateneo', 'status' => TenantStatus::Active],
        ['name' => 'Bonifacio Science Academy', 'code' => 'demo-bonifacio', 'status' => TenantStatus::Active],
        ['name' => 'Cebu Coastal School', 'code' => 'demo-cebu', 'status' => TenantStatus::Active],
        ['name' => 'Davao Scholars Institute', 'code' => 'demo-davao', 'status' => TenantStatus::Active],
        ['name' => 'Emerald Heights Academy', 'code' => 'demo-emerald', 'status' => TenantStatus::Suspended],
        ['name' => 'Filipino Heritage School', 'code' => 'demo-heritage', 'status' => TenantStatus::Active],
        ['name' => 'Golden Fields College', 'code' => 'demo-golden', 'status' => TenantStatus::Active],
        ['name' => 'Harborview Integrated School', 'code' => 'demo-harborview', 'status' => TenantStatus::Active],
        ['name' => 'Iloilo Progressive Academy', 'code' => 'demo-iloilo', 'status' => TenantStatus::Suspended],
        ['name' => 'Jose Rizal Memorial School', 'code' => 'demo-rizal', 'status' => TenantStatus::Active],
        ['name' => 'Katipunan Community School', 'code' => 'demo-katipunan', 'status' => TenantStatus::Archived],
        ['name' => 'Laguna International Academy', 'code' => 'demo-laguna', 'status' => TenantStatus::Active],
    ];

    private const STATION_NAMES = ['Main Entrance', 'Junior High Gate', 'Senior High Lobby'];

    private const AUDIT_ACTIONS = [
        'demo.tenant.reviewed', 'demo.station.health_checked', 'demo.sms.delivery_reviewed',
        'demo.gateway.capacity_checked', 'demo.user.access_reviewed', 'demo.report.exported',
    ];

    public function run(): void
    {
        $superAdmin = User::query()->firstOrCreate(
            ['email' => 'admin@adaptivestation.test'],
            User::factory()->platformSuperAdmin()->make([
                'name' => 'Platform Super Admin', 'password' => 'password', 'password_plaintext' => 'password',
            ])->getAttributes(),
        );
        $tenants = $this->seedClients($superAdmin);
        $stations = $this->seedStations($tenants);
        $this->seedPlatformAdmins();
        $devices = $this->seedGatewayDevices();
        $this->seedSmsDeliveries($tenants, $stations, $devices);
        $this->seedAuditActivity($superAdmin, $tenants, $stations);
    }

    /** @return array<int, Tenant> */
    private function seedClients(User $superAdmin): array
    {
        $tenants = [];
        foreach (self::CLIENTS as $index => $client) {
            $tenant = Tenant::query()->where('code', $client['code'])->first();
            if ($tenant === null) {
                $tenant = Tenant::provision([
                    'name' => $client['name'], 'code' => $client['code'], 'timezone' => 'Asia/Manila',
                ], $superAdmin);
            }
            $tenant->forceFill([
                'name' => $client['name'], 'status' => $client['status'], 'timezone' => 'Asia/Manila',
                'attendance_policy' => ['late_after' => '08:00', 'grace_minutes' => 10],
                'notification_policy' => ['sms_enabled' => true, 'arrival_alerts' => true],
                'created_at' => Date::now()->subDays(84 - ($index * 6)),
            ])->save();
            $tenants[] = $tenant;
        }

        return $tenants;
    }

    /** @param array<int, Tenant> $tenants @return array<string, array<int, Station>> */
    private function seedStations(array $tenants): array
    {
        $stationsByTenant = [];
        foreach ($tenants as $tenantIndex => $tenant) {
            TenantDatabase::use($tenant);
            foreach (self::STATION_NAMES as $stationIndex => $name) {
                $status = match (($tenantIndex + $stationIndex) % 9) {
                    0 => StationStatus::PendingActivation, 7 => StationStatus::Disabled,
                    8 => StationStatus::Retired, default => StationStatus::Active,
                };
                $isOnline = $status === StationStatus::Active && ($tenantIndex + $stationIndex) % 4 !== 0;
                $station = Station::allTenants()->updateOrCreate(
                    ['tenant_id' => $tenant->id, 'station_code' => sprintf('DEMO-%02d-%02d', $tenantIndex + 1, $stationIndex + 1)],
                    ['name' => $name, 'status' => $status,
                        'app_version' => $status === StationStatus::PendingActivation ? null : '2.'.(($tenantIndex + $stationIndex) % 5).'.'.($stationIndex + 1),
                        'configuration' => ['mode' => 'attendance', 'sound' => true]],
                );
                $station->forceFill([
                    'last_seen_at' => $isOnline ? Date::now()->subMinutes(2 + $stationIndex) : Date::now()->subHours(8 + $tenantIndex),
                    'last_scan_at' => $isOnline ? Date::now()->subMinutes(4 + $stationIndex) : Date::now()->subDays(1 + $stationIndex),
                    'last_pending_count' => ($tenantIndex * 3 + $stationIndex) % 12,
                    'created_at' => $tenant->created_at->copy()->addDays(2 + $stationIndex),
                ])->save();
                $stationsByTenant[$tenant->id][] = $station;
            }
        }

        return $stationsByTenant;
    }

    private function seedPlatformAdmins(): void
    {
        $admins = [
            ['Mara Santos', 'mara.santos@adaptivestation.test', true],
            ['Paolo Reyes', 'paolo.reyes@adaptivestation.test', true],
            ['Andrea Lim', 'andrea.lim@adaptivestation.test', true],
            ['Nico Bautista', 'nico.bautista@adaptivestation.test', false],
            ['Sam Villanueva', 'sam.villanueva@adaptivestation.test', true],
        ];
        foreach ($admins as $index => [$name, $email, $active]) {
            User::query()->updateOrCreate(['email' => $email], [
                'name' => $name, 'password' => 'password', 'password_plaintext' => 'password',
                'tenant_id' => null, 'role' => UserRole::AdaptivestationAdmin, 'is_active' => $active,
                'email_verified_at' => Date::now(), 'last_login_at' => Date::now()->subHours(($index + 1) * 7),
            ]);
        }
    }

    /** @return array<int, SmsGatewayDevice> */
    private function seedGatewayDevices(): array
    {
        $devices = [];
        foreach (range(1, 10) as $number) {
            $sent = 38 + ($number * 17);
            $device = SmsGatewayDevice::query()->updateOrCreate(
                ['username' => sprintf('demo-gateway-%02d', $number)],
                ['label' => sprintf('Gateway Phone %02d', $number), 'password' => 'gateway-password',
                    'password_plaintext' => 'gateway-password', 'is_active' => $number !== 10],
            );
            $device->forceFill([
                'last_seen_at' => in_array($number, [8, 9, 10], true) ? Date::now()->subHours($number) : Date::now()->subMinutes($number * 2),
                'sent_today' => $sent, 'delivered_today' => $sent - (3 + $number),
                'failed_today' => $number % 4, 'stats_date' => Date::today(),
            ])->save();
            foreach ([0, 1] as $simSlot) {
                $simSent = intdiv($sent, 2) + ($simSlot === 0 ? $sent % 2 : 0);
                SmsGatewayDeviceSimStat::query()->updateOrCreate(
                    ['device_id' => $device->id, 'sim_slot' => $simSlot],
                    ['sent_today' => $simSent, 'delivered_today' => max(0, $simSent - ($simSlot + 1)),
                        'failed_today' => ($number + $simSlot) % 3, 'stats_date' => Date::today()],
                );
            }
            $devices[] = $device;
        }

        return $devices;
    }

    /** @param array<int, Tenant> $tenants @param array<string, array<int, Station>> $stations @param array<int, SmsGatewayDevice> $devices */
    private function seedSmsDeliveries(array $tenants, array $stations, array $devices): void
    {
        SmsOutboxMessage::query()->where('message', 'like', '[Demo]%')->delete();
        $statuses = [SmsOutboxStatus::Delivered, SmsOutboxStatus::Delivered, SmsOutboxStatus::Delivered,
            SmsOutboxStatus::Delivered, SmsOutboxStatus::Delivered, SmsOutboxStatus::Delivered,
            SmsOutboxStatus::Sent, SmsOutboxStatus::Pending, SmsOutboxStatus::Pending,
            SmsOutboxStatus::Claimed, SmsOutboxStatus::Failed, SmsOutboxStatus::Expired];
        foreach (range(0, 239) as $index) {
            $tenant = $tenants[$index % count($tenants)];
            $station = $stations[$tenant->id][$index % count(self::STATION_NAMES)];
            $device = $devices[$index % count($devices)];
            $status = $statuses[$index % count($statuses)];
            $isInFlight = in_array($status, [SmsOutboxStatus::Pending, SmsOutboxStatus::Claimed], true);
            $createdAt = $isInFlight ? Date::now()->subMinutes(($index % 90) + 1) : Date::now()->subHours(($index % 480) + 1);
            $wasClaimed = in_array($status, [SmsOutboxStatus::Claimed, SmsOutboxStatus::Sent, SmsOutboxStatus::Delivered], true);
            (new SmsOutboxMessage)->forceFill([
                'tenant_id' => $tenant->id, 'person_id' => (string) Str::uuid(), 'parent_account_id' => null,
                'station_id' => $station->id, 'tap_event_id' => (string) Str::uuid(),
                'phone_number' => '0917'.str_pad((string) (1000000 + $index), 7, '0', STR_PAD_LEFT),
                'message' => "[Demo] {$station->name}: student arrival notification #".($index + 1),
                'status' => $status, 'attempts' => $status === SmsOutboxStatus::Failed ? 3 : ($wasClaimed ? 1 : 0),
                'claimed_by_device_id' => $wasClaimed ? $device->id : null,
                'claimed_at' => $wasClaimed ? $createdAt->copy()->addSeconds(8) : null,
                'sim_slot' => $wasClaimed || $status === SmsOutboxStatus::Failed ? $index % 2 : null,
                'expires_at' => $status === SmsOutboxStatus::Expired ? $createdAt->copy()->addMinutes(30) : Date::now()->addMinutes(30),
                'sent_at' => in_array($status, [SmsOutboxStatus::Sent, SmsOutboxStatus::Delivered], true) ? $createdAt->copy()->addSeconds(20) : null,
                'delivered_at' => $status === SmsOutboxStatus::Delivered ? $createdAt->copy()->addSeconds(35) : null,
                'last_error' => $status === SmsOutboxStatus::Failed ? 'Carrier rejected the destination number.' : null,
                'created_at' => $createdAt,
            ])->save();
        }
    }

    /** @param array<int, Tenant> $tenants @param array<string, array<int, Station>> $stations */
    private function seedAuditActivity(User $superAdmin, array $tenants, array $stations): void
    {
        AuditLog::allTenants()->where('action', 'like', 'demo.%')->delete();
        foreach (range(0, 139) as $index) {
            $tenant = $tenants[$index % count($tenants)];
            $station = $stations[$tenant->id][$index % count(self::STATION_NAMES)];
            $system = $index % 5 === 0;
            (new AuditLog)->forceFill([
                'tenant_id' => $index % 7 === 0 ? null : $tenant->id,
                'actor_type' => $system ? AuditActorType::System : AuditActorType::User,
                'actor_id' => $system ? null : $superAdmin->id,
                'action' => self::AUDIT_ACTIONS[$index % count(self::AUDIT_ACTIONS)],
                'entity_type' => $index % 3 === 0 ? 'station' : 'tenant',
                'entity_id' => $index % 3 === 0 ? $station->id : $tenant->id,
                'metadata' => ['source' => 'demo', 'sequence' => $index + 1],
                'ip_address' => '127.0.0.1', 'created_at' => Date::now()->subHours($index * 4),
            ])->save();
        }
    }
}
