<?php

namespace Tests\Feature;

use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\WebAlertNotification;
use App\Services\WebNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class WebNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_and_read_only_their_own_notifications(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->tenantAdmin($tenant)->create();
        $otherUser = User::factory()->tenantAdmin($tenant)->create();

        $user->notify(new WebAlertNotification(
            'station_offline',
            'Station offline',
            'Front gate has stopped reporting.',
            'warning',
            route('portal.dashboard', absolute: false),
            $tenant->name,
        ));
        $otherUser->notify(new WebAlertNotification(
            'gateway_offline',
            'Gateway offline',
            'Gateway phone has stopped reporting.',
            'error',
            route('portal.dashboard', absolute: false),
        ));

        $notification = $user->notifications()->sole();
        $otherNotification = $otherUser->notifications()->sole();

        $this->actingAs($user)->get(route('notifications.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Notifications/index-screen')
                ->where('webNotifications.unread_count', 1)
                ->has('notifications.data', 1)
                ->where('notifications.data.0.id', $notification->id)
                ->where('notifications.data.0.title', 'Station offline'));

        $this->actingAs($user)
            ->patch(route('notifications.read', $otherNotification->id))
            ->assertNotFound();

        $this->actingAs($user)
            ->patch(route('notifications.read', $notification->id))
            ->assertRedirect(route('portal.dashboard', absolute: false));

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_user_can_mark_all_of_their_notifications_as_read(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->tenantAdmin($tenant)->create();
        $otherUser = User::factory()->tenantAdmin($tenant)->create();

        foreach (range(1, 2) as $number) {
            $user->notify(new WebAlertNotification('test', "Alert {$number}", 'Message', 'info', '/dashboard'));
        }
        $otherUser->notify(new WebAlertNotification('test', 'Other alert', 'Message', 'info', '/dashboard'));

        $this->actingAs($user)
            ->patch(route('notifications.read-all'))
            ->assertRedirect();

        $this->assertSame(0, $user->unreadNotifications()->count());
        $this->assertSame(1, $otherUser->unreadNotifications()->count());
    }

    public function test_user_can_save_preferences_that_mute_future_notification_categories(): void
    {
        $tenant = Tenant::factory()->create();
        $mutedUser = User::factory()->tenantAdmin($tenant)->create();
        $enabledUser = User::factory()->tenantOperator($tenant)->create();
        $station = Station::factory()->for($tenant)->create();

        $this->actingAs($mutedUser)
            ->patch(route('notifications.preferences.update'), [
                'categories' => [
                    'stations' => false,
                    'sms_gateway' => true,
                    'sms_delivery' => true,
                    'imports' => true,
                ],
            ])
            ->assertRedirect();

        $this->assertFalse($mutedUser->fresh()->web_notification_preferences['categories']['stations']);

        Notification::fake();
        app(WebNotificationService::class)->notifyStationOffline($station);

        Notification::assertNotSentTo($mutedUser, WebAlertNotification::class);
        Notification::assertSentTo($enabledUser, WebAlertNotification::class);
    }

    public function test_user_can_filter_notification_history_by_category_and_severity(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->tenantAdmin($tenant)->create();
        $user->notify(new WebAlertNotification('station_offline', 'Matching alert', 'Message', 'warning', '/dashboard'));
        $user->notify(new WebAlertNotification('station_recovered', 'Wrong severity', 'Message', 'success', '/dashboard'));
        $user->notify(new WebAlertNotification('import_failed', 'Wrong category', 'Message', 'warning', '/dashboard'));

        $this->actingAs($user)->get(route('notifications.index', [
            'category' => 'stations',
            'severity' => 'warning',
        ]))->assertInertia(fn ($page) => $page
            ->component('Notifications/index-screen')
            ->has('notifications.data', 1)
            ->where('notifications.data.0.title', 'Matching alert')
            ->where('filters.category', 'stations')
            ->where('filters.severity', 'warning')
            ->where('preferences.categories.stations', true));
    }

    public function test_notification_screen_is_available_to_every_web_portal_role(): void
    {
        $tenant = Tenant::factory()->create();
        $users = [
            User::factory()->platformSuperAdmin()->create(),
            User::factory()->adaptivestationAdmin()->create(),
            User::factory()->tenantAdmin($tenant)->create(),
            User::factory()->tenantOperator($tenant)->create(),
        ];

        foreach ($users as $user) {
            $this->actingAs($user)
                ->get(route('notifications.index'))
                ->assertOk()
                ->assertInertia(fn ($page) => $page->component('Notifications/index-screen'));
        }
    }
}
