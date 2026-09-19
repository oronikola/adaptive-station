<?php

namespace Tests\Feature;

use App\Models\AttendanceException;
use App\Models\Person;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_define_a_non_school_day_and_record_an_attendance_exception(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        $date = '2026-09-21';

        $this->actingAs($admin)->post(route('portal.attendance.calendar-days.store'), [
            'date' => $date,
            'is_school_day' => false,
            'label' => 'Foundation Day',
        ])->assertRedirect();

        $this->assertDatabaseHas('attendance_calendar_days', [
            'tenant_id' => $tenant->id,
            'date' => $date,
            'is_school_day' => false,
            'label' => 'Foundation Day',
        ], 'tenant');

        $this->actingAs($admin)->post(route('portal.attendance.exceptions.store'), [
            'person_id' => $person->id,
            'attendance_date' => $date,
            'type' => 'excused_absence',
            'reason' => 'School-approved competition.',
        ])->assertRedirect();

        $exception = AttendanceException::query()->firstOrFail();
        $this->assertSame('open', $exception->status);

        $this->actingAs($admin)
            ->patch(route('portal.attendance.exceptions.resolve', $exception))
            ->assertRedirect();

        $this->assertDatabaseHas('attendance_exceptions', [
            'id' => $exception->id,
            'status' => 'resolved',
            'resolved_by_user_id' => $admin->id,
        ], 'tenant');
    }

    public function test_operations_screen_only_shows_the_current_tenants_exception_queue(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $personA = Person::factory()->for($tenantA)->create();
        $personB = Person::factory()->for($tenantB)->create();

        AttendanceException::query()->create([
            'tenant_id' => $tenantA->id,
            'person_id' => $personA->id,
            'attendance_date' => '2026-09-01',
            'type' => 'late_review',
            'reason' => 'Traffic disruption.',
        ]);
        AttendanceException::allTenants()->create([
            'tenant_id' => $tenantB->id,
            'person_id' => $personB->id,
            'attendance_date' => '2026-09-01',
            'type' => 'late_review',
            'reason' => 'Other school record.',
        ]);

        $this->actingAs($adminA)
            ->get(route('portal.attendance.operations.index', ['month' => '2026-09-01']))
            ->assertInertia(fn ($page) => $page
                ->has('exceptions', 1)
                ->where('exceptions.0.reason', 'Traffic disruption.'));
    }
}
