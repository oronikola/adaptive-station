<?php

namespace Tests\Feature\Portal;

use App\Enums\TapEventType;
use App\Models\Person;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AttendanceSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_each_filter_narrows_the_results_correctly(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $stationA = Station::factory()->for($tenant)->create();
        $stationB = Station::factory()->for($tenant)->create();
        $personA = Person::factory()->for($tenant)->create();
        $personB = Person::factory()->for($tenant)->create();

        $target = TapEvent::factory()->for($stationA)->create([
            'person_id' => $personA->id,
            'card_uid' => 'TARGET01',
            'event_type' => TapEventType::In,
        ]);

        TapEvent::factory()->for($stationB)->create([
            'person_id' => $personB->id,
            'card_uid' => 'OTHER01',
            'event_type' => TapEventType::Out,
        ]);

        $this->actingAs($admin)->get(route('portal.attendance.index', ['person_id' => $personA->id]))
            ->assertInertia(fn ($page) => $page->has('events.data', 1)->where('events.data.0.id', $target->id)->where('analytics.busiest_day.total', 1)->has('analytics.stations', 1));

        $this->actingAs($admin)->get(route('portal.attendance.index', ['card_uid' => 'target01']))
            ->assertInertia(fn ($page) => $page->has('events.data', 1)->where('events.data.0.id', $target->id)->where('analytics.busiest_day.total', 1)->has('analytics.stations', 1));

        $this->actingAs($admin)->get(route('portal.attendance.index', ['station_id' => $stationA->id]))
            ->assertInertia(fn ($page) => $page->has('events.data', 1)->where('events.data.0.id', $target->id)->where('analytics.busiest_day.total', 1)->has('analytics.stations', 1));

        $this->actingAs($admin)->get(route('portal.attendance.index', ['event_type' => 'IN']))
            ->assertInertia(fn ($page) => $page->has('events.data', 1)->where('events.data.0.id', $target->id)->where('analytics.busiest_day.total', 1)->has('analytics.stations', 1));
    }

    public function test_attendance_date_local_uses_the_tenant_timezone_across_utc_midnight(): void
    {
        $tenant = Tenant::factory()->create(['timezone' => 'Asia/Manila']); // UTC+8
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create();

        // 2026-01-01 20:00 UTC is already 2026-01-02 04:00 in Asia/Manila.
        $event = TapEvent::factory()->for($station)->create([
            'occurred_at' => Carbon::parse('2026-01-01 20:00:00', 'UTC'),
        ]);

        $this->assertSame('2026-01-02', $event->attendance_date_local->toDateString());

        $this->actingAs($admin)
            ->get(route('portal.attendance.index', ['date_from' => '2026-01-02', 'date_to' => '2026-01-02']))
            ->assertInertia(fn ($page) => $page->has('events.data', 1));

        $this->actingAs($admin)
            ->get(route('portal.attendance.index', ['date_from' => '2026-01-01', 'date_to' => '2026-01-01']))
            ->assertInertia(fn ($page) => $page->has('events.data', 0)->where('analytics.recorded_days', 0)->where('analytics.busiest_day', null)->has('analytics.trend', 0)->has('analytics.stations', 0));
    }

    public function test_a_tenant_admin_never_sees_another_tenants_attendance(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $stationA = Station::factory()->for($tenantA)->create();
        $stationB = Station::factory()->for($tenantB)->create();

        TapEvent::factory()->for($stationA)->create(['card_uid' => 'A0001']);
        TapEvent::factory()->for($stationB)->create(['card_uid' => 'B0001']);

        $this->actingAs($adminA)->get(route('portal.attendance.index'))
            ->assertInertia(fn ($page) => $page
                ->has('events.data', 1)
                ->where('events.data.0.card_uid', 'A0001'));
    }

    /**
     * The full roster is never sent as a page prop (a tenant can have
     * thousands of people) — instead the Person filter searches on demand
     * via this endpoint, and only the currently-selected person (if any) is
     * resolved up front for display.
     */
    public function test_the_full_roster_is_not_shipped_as_a_page_prop(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Person::factory()->for($tenant)->count(3)->create();

        $this->actingAs($admin)->get(route('portal.attendance.index'))
            ->assertInertia(fn ($page) => $page->missing('people')->where('selectedPerson', null));
    }

    public function test_selecting_a_person_filter_resolves_that_one_person_for_display(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create(['display_name' => 'Jane Doe']);

        $this->actingAs($admin)->get(route('portal.attendance.index', ['person_id' => $person->id]))
            ->assertInertia(fn ($page) => $page
                ->where('selectedPerson.id', $person->id)
                ->where('selectedPerson.display_name', 'Jane Doe'));
    }

    public function test_people_search_finds_matches_by_name_and_is_scoped_to_the_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $otherTenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Person::factory()->for($tenant)->create(['display_name' => 'Alice Rivera']);
        Person::factory()->for($tenant)->create(['display_name' => 'Bob Santos']);
        Person::factory()->for($otherTenant)->create(['display_name' => 'Alice Cruz']);

        $response = $this->actingAs($admin)->getJson(route('portal.attendance.people-search', ['search' => 'alice']));

        $response->assertOk();
        $names = collect($response->json('people'))->pluck('display_name');
        $this->assertTrue($names->contains('Alice Rivera'));
        $this->assertFalse($names->contains('Bob Santos'));
        $this->assertFalse($names->contains('Alice Cruz'));
    }

    public function test_stats_reflect_the_current_filter_set(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create();
        $personA = Person::factory()->for($tenant)->create();
        $personB = Person::factory()->for($tenant)->create();

        TapEvent::factory()->for($station)->create(['person_id' => $personA->id, 'event_type' => TapEventType::In]);
        TapEvent::factory()->for($station)->create(['person_id' => $personA->id, 'event_type' => TapEventType::Out]);
        TapEvent::factory()->for($station)->create(['person_id' => $personB->id, 'event_type' => TapEventType::In]);

        $this->actingAs($admin)->get(route('portal.attendance.index'))
            ->assertInertia(fn ($page) => $page
                ->where('stats.total', 3)
                ->where('stats.unique_people', 2)
                ->where('stats.in', 2)
                ->where('stats.out', 1));
    }

    public function test_analytics_include_every_page_and_exclude_other_schools_and_dates(): void
    {
        $this->travelTo(Carbon::parse('2026-09-14 12:00:00', 'UTC'));
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create();
        $otherStation = Station::factory()->create();
        $person = Person::factory()->for($tenant)->create();
        TapEvent::factory()->for($station)->count(51)->create([
            'person_id' => $person->id, 'event_type' => TapEventType::In,
            'attendance_date_local' => '2026-09-12',
        ]);
        TapEvent::factory()->for($station)->create([
            'person_id' => $person->id, 'event_type' => TapEventType::Out,
            'attendance_date_local' => '2026-09-14',
        ]);
        TapEvent::factory()->for($station)->create(['attendance_date_local' => '2026-09-11']);
        TapEvent::factory()->for($otherStation)->create(['attendance_date_local' => '2026-09-12']);

        $this->actingAs($admin)->get(route('portal.attendance.index', ['date_from' => '2026-09-12', 'date_to' => '2026-09-14', 'page' => 2]))
            ->assertInertia(fn ($page) => $page
                ->has('events.data', 2)->where('stats.total', 52)
                ->where('analytics.recorded_days', 2)->where('analytics.average_taps', 26)
                ->where('analytics.granularity', 'day')->has('analytics.trend', 3)
                ->where('analytics.trend.0.in', 51)->where('analytics.trend.0.out', 0)
                ->where('analytics.trend.0.unique_people', 1)
                ->where('analytics.trend.1.total', 0)
                ->where('analytics.trend.2.in', 0)->where('analytics.trend.2.out', 1)
                ->where('analytics.busiest_day.date', '2026-09-12')->where('analytics.busiest_day.total', 51)
                ->has('analytics.stations', 1)->where('analytics.stations.0.id', $station->id)
                ->where('analytics.stations.0.total', 52));
    }

    #[TestWith(['2026-01-31', 'day', 31])]
    #[TestWith(['2026-02-01', 'month', 2])]
    #[TestWith(['2027-12-31', 'month', 24])]
    #[TestWith(['2028-01-01', 'year', 3])]
    public function test_analytics_adapt_calendar_buckets_and_count_distinct_people(string $lastDate, string $granularity, int $periods): void
    {
        $this->travelTo(Carbon::parse('2028-01-02 12:00:00', 'UTC'));
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        $station = Station::factory()->for($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        TapEvent::factory()->for($station)->count(2)->create([
            'person_id' => $person->id, 'attendance_date_local' => '2026-01-01', 'event_type' => TapEventType::In,
        ]);
        TapEvent::factory()->for($station)->create(['attendance_date_local' => $lastDate, 'event_type' => TapEventType::Out]);

        $this->actingAs($operator)->get(route('portal.attendance.index'))->assertInertia(fn ($page) => $page
            ->where('analytics.granularity', $granularity)->has('analytics.trend', $periods)
            ->where('analytics.trend.0.total', 2)->where('analytics.trend.0.unique_people', 1)
            ->where('analytics.date_from', '2026-01-01')->where('analytics.date_to', $lastDate)
            ->where('analytics.average_taps', 1.5)
            ->where('analytics.trend', fn ($trend) => collect($trend)->sum('total') === 3));
    }

    public function test_station_analytics_are_ranked_and_capped_and_busiest_day_ties_use_the_latest_date(): void
    {
        $this->travelTo(Carbon::parse('2026-09-14 12:00:00', 'UTC'));
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $topStation = Station::factory()->for($tenant)->create(['name' => 'Main gate']);
        TapEvent::factory()->for($topStation)->count(3)->create(['attendance_date_local' => '2026-09-12']);
        TapEvent::factory()->for($topStation)->count(3)->create(['attendance_date_local' => '2026-09-14']);
        foreach (range(1, 5) as $index) {
            $station = Station::factory()->for($tenant)->create();
            TapEvent::factory()->for($station)->create(['attendance_date_local' => '2026-09-0'.$index]);
        }

        $this->actingAs($admin)->get(route('portal.attendance.index'))->assertInertia(fn ($page) => $page
            ->has('analytics.stations', 5)->where('analytics.stations.0.name', 'Main gate')
            ->where('analytics.stations.0.total', 6)
            ->where('analytics.busiest_day.date', '2026-09-14')->where('analytics.busiest_day.total', 3));
    }
}
