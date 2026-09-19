<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StoreAttendanceCalendarDayRequest;
use App\Http\Requests\Portal\StoreAttendanceExceptionRequest;
use App\Models\AttendanceCalendarDay;
use App\Models\AttendanceException;
use App\Models\AuditLog;
use App\Models\Person;
use App\Models\TapEvent;
use App\Support\TenantContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceOperationsController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', TapEvent::class);

        $month = Date::parse($request->string('month')->toString() ?: Date::now()->toDateString())->startOfMonth();
        $start = $month->copy();
        $end = $month->copy()->endOfMonth();

        return Inertia::render('Admin/attendance/attendance-operations-screen', [
            'month' => $month->toDateString(),
            'calendarDays' => AttendanceCalendarDay::query()
                ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
                ->orderBy('date')
                ->get()
                ->map(fn (AttendanceCalendarDay $day): array => [
                    'id' => $day->id,
                    'date' => $day->date->toDateString(),
                    'is_school_day' => $day->is_school_day,
                    'label' => $day->label,
                ]),
            'exceptions' => AttendanceException::query()
                ->with('person:id,display_name,grade_level')
                ->whereBetween('attendance_date', [$start->toDateString(), $end->toDateString()])
                ->latest('attendance_date')
                ->latest('created_at')
                ->limit(100)
                ->get()
                ->map(fn (AttendanceException $exception): array => [
                    'id' => $exception->id,
                    'attendance_date' => $exception->attendance_date->toDateString(),
                    'type' => $exception->type,
                    'status' => $exception->status,
                    'reason' => $exception->reason,
                    'person' => $exception->person ? [
                        'id' => $exception->person->id,
                        'display_name' => $exception->person->display_name,
                        'grade_level' => $exception->person->grade_level,
                    ] : null,
                ]),
            'people' => Person::query()->where('is_active', true)->orderBy('display_name')->limit(500)
                ->get(['id', 'display_name', 'grade_level']),
        ]);
    }

    public function storeCalendarDay(StoreAttendanceCalendarDayRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $tenantId = app(TenantContext::class)->get();
        $day = AttendanceCalendarDay::query()->updateOrCreate(
            ['tenant_id' => $tenantId, 'date' => $data['date']],
            ['is_school_day' => $data['is_school_day'], 'label' => $data['label'] ?? null],
        );

        AuditLog::record('attendance.calendar_day_saved', $request->user(), $tenantId, 'attendance_calendar_day', $day->id, [
            'date' => $day->date->toDateString(),
            'is_school_day' => $day->is_school_day,
        ]);

        return back()->with('success', 'Calendar day saved.');
    }

    public function storeException(StoreAttendanceExceptionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $tenantId = app(TenantContext::class)->get();
        $exception = AttendanceException::query()->create([...$data, 'tenant_id' => $tenantId]);

        AuditLog::record('attendance.exception_created', $request->user(), $tenantId, 'attendance_exception', $exception->id, [
            'type' => $exception->type,
            'attendance_date' => $exception->attendance_date->toDateString(),
            'person_id' => $exception->person_id,
        ]);

        return back()->with('success', 'Attendance exception recorded.');
    }

    public function resolveException(Request $request, AttendanceException $exception): RedirectResponse
    {
        Gate::authorize('viewAny', TapEvent::class);

        $exception->forceFill([
            'status' => 'resolved',
            'resolved_by_user_id' => $request->user()->id,
            'resolved_at' => Date::now(),
        ])->save();

        AuditLog::record('attendance.exception_resolved', $request->user(), $exception->tenant_id, 'attendance_exception', $exception->id);

        return back()->with('success', 'Attendance exception resolved.');
    }
}
