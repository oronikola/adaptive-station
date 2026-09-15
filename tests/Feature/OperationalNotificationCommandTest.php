<?php

namespace Tests\Feature;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\WebAlertNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class OperationalNotificationCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_station_alert_is_deduplicated_and_followed_by_a_recovery(): void
    {
        Notification::fake();
        $this->travelTo(Date::parse('2026-09-15 01:00:00', 'UTC'));
        config(['device.station_offline_threshold_minutes' => 5]);
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        $oversight = User::factory()->adaptivestationAdmin()->create();
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $station = Station::factory()->for($tenant)->create(['last_seen_at' => now()->subMinutes(6)]);

        $this->artisan('notifications:check-operational')->assertSuccessful();
        $this->artisan('notifications:check-operational')->assertSuccessful();

        foreach ([$admin, $operator, $oversight] as $recipient) {
            Notification::assertSentToTimes($recipient, WebAlertNotification::class, 1);
            Notification::assertSentTo($recipient, WebAlertNotification::class, fn (WebAlertNotification $notification): bool => $notification->category === 'station_offline');
        }
        Notification::assertNotSentTo($platformAdmin, WebAlertNotification::class);

        $station->forceFill(['last_seen_at' => now()])->save();
        $this->artisan('notifications:check-operational')->assertSuccessful();

        foreach ([$admin, $operator, $oversight] as $recipient) {
            Notification::assertSentToTimes($recipient, WebAlertNotification::class, 2);
            Notification::assertSentTo($recipient, WebAlertNotification::class, fn (WebAlertNotification $notification): bool => $notification->category === 'station_recovered');
        }
    }

    public function test_gateway_backlog_and_delivery_failures_alert_only_operations_users(): void
    {
        Notification::fake();
        $this->travelTo(Date::parse('2026-09-15 01:00:00', 'UTC'));
        config([
            'device.sms_gateway_offline_threshold_minutes' => 3,
            'device.sms_backlog_alert_threshold_minutes' => 30,
        ]);
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $oversight = User::factory()->adaptivestationAdmin()->create();
        $gateway = SmsGatewayDevice::forceCreate([
            'label' => 'Gateway One',
            'is_active' => true,
            'last_seen_at' => now()->subMinutes(4),
        ]);
        $pending = $this->sms($tenant, SmsOutboxStatus::Pending, now()->subMinutes(31));
        $this->sms($tenant, SmsOutboxStatus::Failed, now()->subMinute());

        $this->artisan('notifications:check-operational')->assertSuccessful();
        $this->artisan('notifications:check-operational')->assertSuccessful();

        foreach ([$platformAdmin, $oversight] as $recipient) {
            Notification::assertSentToTimes($recipient, WebAlertNotification::class, 3);
            foreach (['gateway_offline', 'sms_backlog_delayed', 'sms_delivery_failed'] as $category) {
                Notification::assertSentTo($recipient, WebAlertNotification::class, fn (WebAlertNotification $notification): bool => $notification->category === $category);
            }
        }
        Notification::assertNotSentTo($tenantAdmin, WebAlertNotification::class);

        $gateway->forceFill(['last_seen_at' => now()])->save();
        $pending->forceFill(['status' => SmsOutboxStatus::Sent])->save();
        $this->artisan('notifications:check-operational')->assertSuccessful();

        foreach ([$platformAdmin, $oversight] as $recipient) {
            Notification::assertSentToTimes($recipient, WebAlertNotification::class, 5);
            Notification::assertSentTo($recipient, WebAlertNotification::class, fn (WebAlertNotification $notification): bool => $notification->category === 'gateway_recovered');
            Notification::assertSentTo($recipient, WebAlertNotification::class, fn (WebAlertNotification $notification): bool => $notification->category === 'sms_backlog_recovered');
        }
    }

    private function sms(Tenant $tenant, SmsOutboxStatus $status, mixed $createdAt): SmsOutboxMessage
    {
        return SmsOutboxMessage::forceCreate([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => 'Attendance notification',
            'status' => $status,
            'expires_at' => now()->addHour(),
            'created_at' => $createdAt,
        ]);
    }
}
