<?php

namespace Tests\Feature\Portal;

use App\Enums\SmsOutboxStatus;
use App\Enums\StationStatus;
use App\Enums\TapEventType;
use App\Models\Person;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_uses_the_school_date_and_returns_seven_days_with_distinct_people(): void
    {
        $this->travelTo(Date::parse('2026-09-14 17:00:00', 'UTC'));
        $tenant = Tenant::factory()->create(['timezone' => 'Asia/Manila']);
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        TapEvent::factory()->count(2)->create([
            'station_id' => $station->id, 'person_id' => $person->id,
            'occurred_at' => '2026-09-14 16:30:00', 'received_at' => '2026-09-14 16:31:00',
        ]);
        TapEvent::factory()->create(['station_id' => $station->id, 'attendance_date_local' => '2026-09-15', 'person_id' => null]);
        TapEvent::factory()->create(['station_id' => $station->id, 'attendance_date_local' => '2026-09-09']);
        TapEvent::factory()->create(['station_id' => $station->id, 'attendance_date_local' => '2026-09-08']);
        TapEvent::factory()->create(['station_id' => $station->id, 'attendance_date_local' => '2026-09-16']);

        $this->actingAs($admin)->get(route('portal.dashboard'))->assertInertia(fn ($page) => $page
            ->component('Admin/dashboard/dashboard-screen')
            ->where('today', '2026-09-15')
            ->where('timezone', 'Asia/Manila')
            ->where('stats.station_count', 1)
            ->where('stats.taps_today', 3)->where('stats.people_today', 1)
            ->has('weeklyAttendance', 7)
            ->where('weeklyAttendance.0.attendance_date_local', '2026-09-09')
            ->where('weeklyAttendance.0.total', 1)
            ->where('weeklyAttendance.1.total', 0)
            ->where('weeklyAttendance.6.attendance_date_local', '2026-09-15')
            ->where('weeklyAttendance.6.total', 3)
            ->where('weeklyAttendance.6.unique_people', 1));
    }

    public function test_weekly_attendance_reports_tapped_in_and_tapped_out_counts_separately(): void
    {
        $this->travelTo(Date::parse('2026-09-14 17:00:00', 'UTC'));
        $tenant = Tenant::factory()->create(['timezone' => 'Asia/Manila']);
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create();
        TapEvent::factory()->count(2)->create([
            'station_id' => $station->id, 'attendance_date_local' => '2026-09-15', 'event_type' => TapEventType::In,
        ]);
        TapEvent::factory()->create([
            'station_id' => $station->id, 'attendance_date_local' => '2026-09-15', 'event_type' => TapEventType::Out,
        ]);

        $this->actingAs($admin)->get(route('portal.dashboard'))->assertInertia(fn ($page) => $page
            ->where('weeklyAttendance.6.attendance_date_local', '2026-09-15')
            ->where('weeklyAttendance.6.total', 3)
            ->where('weeklyAttendance.6.in', 2)
            ->where('weeklyAttendance.6.out', 1));
    }

    public function test_it_separates_enabled_online_and_offline_stations_at_the_configured_cutoff(): void
    {
        $this->travelTo(Date::parse('2026-09-14 12:00:00', 'UTC'));
        config(['device.station_offline_threshold_minutes' => 10]);
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Station::factory()->for($tenant)->create(['last_seen_at' => now()->subMinutes(9)]);
        $boundary = Station::factory()->for($tenant)->create(['last_seen_at' => now()->subMinutes(10)]);
        $neverSeen = Station::factory()->for($tenant)->create(['last_seen_at' => null]);
        Station::factory()->for($tenant)->create(['status' => StationStatus::Disabled, 'last_seen_at' => now()]);
        Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        $this->actingAs($admin)->get(route('portal.dashboard'))->assertInertia(fn ($page) => $page
            ->where('stats.station_count', 5)->where('stats.active_station_count', 3)
            ->where('stats.online_station_count', 1)->where('stats.offline_station_count', 2)
            ->where('stationHealth.threshold_minutes', 10)
            ->has('stationHealth.offline_stations', 2)
            ->where('stationHealth.offline_stations.0.id', $neverSeen->id)
            ->where('stationHealth.offline_stations.0.last_seen_at', null)
            ->where('stationHealth.offline_stations.1.id', $boundary->id));
    }

    public function test_it_scopes_health_attendance_and_failed_sms_to_the_selected_school(): void
    {
        $this->travelTo(Date::parse('2026-09-14 12:00:00', 'UTC'));
        $tenant = Tenant::factory()->create(['timezone' => 'UTC']);
        $otherTenant = Tenant::factory()->create();
        $admin = User::factory()->adaptivestationAdmin()->create();
        $station = Station::factory()->for($tenant)->create(['last_seen_at' => now()]);
        $otherStation = Station::factory()->for($otherTenant)->create();
        TapEvent::factory()->create(['station_id' => $station->id, 'attendance_date_local' => '2026-09-14', 'received_at' => '2026-09-14 11:00:00']);
        TapEvent::factory()->create(['station_id' => $station->id, 'attendance_date_local' => '2026-09-13', 'received_at' => '2026-09-14 11:30:00', 'source_system' => 'legacy']);
        TapEvent::factory()->create(['station_id' => $otherStation->id, 'attendance_date_local' => '2026-09-14', 'received_at' => now()]);
        $this->sms($tenant, SmsOutboxStatus::Failed);
        $this->sms($tenant, SmsOutboxStatus::Sent);
        $this->sms($otherTenant, SmsOutboxStatus::Failed);

        $this->actingAs($admin)->withSession(['oversight_tenant_id' => $tenant->id])
            ->get(route('portal.dashboard'))->assertInertia(fn ($page) => $page
            ->where('stats.station_count', 1)->where('stats.offline_station_count', 0)
            ->where('stats.taps_today', 1)->where('stats.sms_failures', 1)
            ->where('stationHealth.last_attendance_sync_at', '2026-09-14T11:00:00+00:00')
            ->has('stationHealth.offline_stations', 0));
    }

    #[TestWith(['tenantAdmin'])]
    #[TestWith(['tenantOperator'])]
    public function test_it_hides_sms_counts_from_roles_without_delivery_log_access(string $role): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->{$role}($tenant)->create();
        $this->sms($tenant, SmsOutboxStatus::Failed);

        $this->actingAs($user)->get(route('portal.dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('stats.sms_failures', null)
                ->where('smsHealth', null)
                ->has('stationVolume'));
    }

    public function test_sms_health_folds_statuses_and_reports_the_top_failure_reason_for_delivery_access(): void
    {
        $tenant = Tenant::factory()->create(['timezone' => 'UTC']);
        $otherTenant = Tenant::factory()->create();
        $admin = User::factory()->adaptivestationAdmin()->create();
        $this->sms($tenant, SmsOutboxStatus::Failed);
        $this->sms($tenant, SmsOutboxStatus::Failed);
        $this->sms($tenant, SmsOutboxStatus::Expired);
        $this->sms($tenant, SmsOutboxStatus::Sent);
        $this->sms($tenant, SmsOutboxStatus::Delivered);
        $this->sms($tenant, SmsOutboxStatus::Claimed);
        $this->sms($tenant, SmsOutboxStatus::Pending);
        $this->sms($otherTenant, SmsOutboxStatus::Failed);
        SmsOutboxMessage::where('tenant_id', $tenant->id)
            ->where('status', SmsOutboxStatus::Failed)
            ->update(['failure_category' => 'RADIO_TEARDOWN', 'last_error' => 'radio down']);

        $this->actingAs($admin)->withSession(['oversight_tenant_id' => $tenant->id])
            ->get(route('portal.dashboard'))->assertInertia(fn ($page) => $page
            ->where('smsHealth.total', 7)
            ->where('smsHealth.pending', 2)
            ->where('smsHealth.sent', 1)
            ->where('smsHealth.delivered', 1)
            ->where('smsHealth.failed', 3)
            ->where('smsHealth.topFailure.category', 'RADIO_TEARDOWN')
            ->where('smsHealth.topFailure.count', 2));
    }

    public function test_sms_health_reports_null_top_failure_when_no_failed_messages_are_categorized(): void
    {
        $tenant = Tenant::factory()->create(['timezone' => 'UTC']);
        $admin = User::factory()->adaptivestationAdmin()->create();
        $this->sms($tenant, SmsOutboxStatus::Failed);
        $this->sms($tenant, SmsOutboxStatus::Delivered);

        $this->actingAs($admin)->withSession(['oversight_tenant_id' => $tenant->id])
            ->get(route('portal.dashboard'))->assertInertia(fn ($page) => $page
            ->where('smsHealth.failed', 1)
            ->where('smsHealth.topFailure', null));
    }

    public function test_station_volume_totals_taps_per_station_over_seven_days_and_drops_quiet_ones(): void
    {
        $this->travelTo(Date::parse('2026-09-14 12:00:00', 'UTC'));
        $tenant = Tenant::factory()->create(['timezone' => 'UTC']);
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $busy = Station::factory()->for($tenant)->create();
        $quiet = Station::factory()->for($tenant)->create();
        TapEvent::factory()->count(4)->create(['station_id' => $busy->id, 'attendance_date_local' => '2026-09-14']);
        TapEvent::factory()->create(['station_id' => $busy->id, 'attendance_date_local' => '2026-09-08']);
        TapEvent::factory()->create(['station_id' => $quiet->id, 'attendance_date_local' => '2026-09-07']);

        $this->actingAs($admin)->get(route('portal.dashboard'))->assertInertia(fn ($page) => $page
            ->has('stationVolume', 1)
            ->where('stationVolume.0.id', $busy->id)
            ->where('stationVolume.0.name', $busy->name)
            ->where('stationVolume.0.total', 5));
    }

    public function test_it_returns_an_empty_overview_and_a_complete_zero_filled_week(): void
    {
        $this->travelTo(Date::parse('2026-09-14 12:00:00', 'UTC'));
        $tenant = Tenant::factory()->create(['timezone' => 'UTC']);
        $user = User::factory()->adaptivestationAdmin()->create();

        $this->actingAs($user)->withSession(['oversight_tenant_id' => $tenant->id])
            ->get(route('portal.dashboard'))->assertInertia(fn ($page) => $page
            ->where('stats.taps_today', 0)->where('stats.people_today', 0)
            ->where('stats.station_count', 0)->where('stats.online_station_count', 0)
            ->where('stats.sms_failures', 0)
            ->where('stationHealth.last_attendance_sync_at', null)
            ->has('stationHealth.offline_stations', 0)
            ->has('weeklyAttendance', 7)
            ->where('weeklyAttendance.0.attendance_date_local', '2026-09-08')
            ->where('weeklyAttendance', fn ($days) => collect($days)->sum('total') === 0));
    }

    private function sms(Tenant $tenant, SmsOutboxStatus $status): SmsOutboxMessage
    {
        return SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => 'Attendance notification',
            'status' => $status,
            'expires_at' => now()->addMinutes(30),
        ]);
    }
}
