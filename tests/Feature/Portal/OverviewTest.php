<?php

namespace Tests\Feature\Portal;

use App\Enums\StationStatus;
use App\Models\Person;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class OverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_both_roles_can_view_the_overview(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $operator = User::factory()->tenantOperator($tenant)->create();

        $this->actingAs($admin)->get(route('portal.overview.index'))->assertOk();
        $this->actingAs($operator)->get(route('portal.overview.index'))->assertOk();
    }

    public function test_stats_reflect_todays_activity_and_pending_sync(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $activeStation = Station::factory()->for($tenant)->create([
            'status' => StationStatus::Active,
            'last_pending_count' => 3,
        ]);
        Station::factory()->for($tenant)->create([
            'status' => StationStatus::PendingActivation,
            'last_pending_count' => 2,
        ]);
        $person = Person::factory()->for($tenant)->create();

        TapEvent::factory()->for($activeStation)->create([
            'person_id' => $person->id,
            'occurred_at' => Date::now(),
        ]);
        TapEvent::factory()->for($activeStation)->create([
            'person_id' => $person->id,
            'occurred_at' => Date::now(),
        ]);

        $response = $this->actingAs($admin)->get(route('portal.overview.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('stats.station_count', 2)
            ->where('stats.active_station_count', 1)
            ->where('stats.taps_today', 2)
            ->where('stats.people_today', 1)
            ->where('stats.pending_sync', 5));
    }

    public function test_daily_performance_groups_recent_taps_by_day(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $person = Person::factory()->for($tenant)->create();

        $event = TapEvent::factory()->for($station)->create([
            'person_id' => $person->id,
            'occurred_at' => Date::now(),
        ]);
        TapEvent::factory()->for($station)->create([
            'person_id' => $person->id,
            'occurred_at' => Date::now(),
        ]);

        $date = $event->attendance_date_local->toDateString();

        $response = $this->actingAs($admin)->get(route('portal.overview.index'));

        $response->assertInertia(fn ($page) => $page
            ->has('dailyPerformance', 1)
            ->where('dailyPerformance.0.date', $date)
            ->where('dailyPerformance.0.total', 2)
            ->where('dailyPerformance.0.unique_people', 1));
    }

    public function test_overview_is_tenant_isolated(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        Station::factory()->for($tenantA)->create(['name' => 'Station A', 'status' => StationStatus::Active]);
        Station::factory()->for($tenantB)->create(['name' => 'Station B', 'status' => StationStatus::Active]);

        $response = $this->actingAs($adminA)->get(route('portal.overview.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('stats.station_count', 1)
            ->has('stations', 1)
            ->where('stations.0.name', 'Station A'));
    }
}
