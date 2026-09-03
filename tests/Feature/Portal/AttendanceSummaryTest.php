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

class AttendanceSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_groups_counts_by_day(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $person = Person::factory()->for($tenant)->create();

        $eventA = TapEvent::factory()->for($station)->create([
            'person_id' => $person->id,
            'occurred_at' => Date::now(),
        ]);
        TapEvent::factory()->for($station)->create([
            'person_id' => $person->id,
            'occurred_at' => Date::now(),
        ]);

        $date = $eventA->attendance_date_local->toDateString();

        $response = $this->actingAs($admin)->get(route('portal.attendance.summary', [
            'date_from' => $date,
            'date_to' => $date,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('summary.data', 1)
            ->where('summary.data.0.attendance_date_local', $date)
            ->where('summary.data.0.total', 2)
            ->where('summary.data.0.unique_people', 1));
    }

    public function test_summary_is_tenant_isolated(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $stationA = Station::factory()->for($tenantA)->create(['status' => StationStatus::Active]);
        $stationB = Station::factory()->for($tenantB)->create(['status' => StationStatus::Active]);

        TapEvent::factory()->for($stationA)->create(['occurred_at' => Date::now()]);
        TapEvent::factory()->for($stationB)->create(['occurred_at' => Date::now()]);

        $response = $this->actingAs($adminA)->get(route('portal.attendance.summary'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('summary.data', 1)
            ->where('summary.data.0.total', 1));
    }
}
