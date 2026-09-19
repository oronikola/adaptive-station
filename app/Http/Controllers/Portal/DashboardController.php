<?php

namespace App\Http\Controllers\Portal;

use App\Enums\SmsOutboxStatus;
use App\Enums\StationStatus;
use App\Http\Controllers\Controller;
use App\Models\AttendanceException;
use App\Models\AuditLog;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->get();
        $timezone = Tenant::findOrFail($tenantId)->timezone;
        $now = Date::now();
        $today = $now->copy()->setTimezone($timezone)->startOfDay();
        $thresholdMinutes = (int) config('device.station_offline_threshold_minutes');
        $cutoff = $now->copy()->subMinutes($thresholdMinutes);

        $enabledStations = Station::query()->where('status', StationStatus::Active);
        $enabledCount = (clone $enabledStations)->count();
        $onlineCount = (clone $enabledStations)->where('last_seen_at', '>', $cutoff)->count();

        $attendance = TapEvent::query()
            ->selectRaw('attendance_date_local, count(*) as total, count(distinct person_id) as unique_people')
            ->whereBetween('attendance_date_local', [$today->copy()->subDays(6)->toDateString(), $today->toDateString()])
            ->groupBy('attendance_date_local')
            ->get()
            ->keyBy(fn (TapEvent $row): string => $row->attendance_date_local->toDateString());

        $weeklyAttendance = collect(range(6, 0))->map(function (int $daysAgo) use ($today, $attendance): array {
            $date = $today->copy()->subDays($daysAgo)->toDateString();
            $row = $attendance->get($date);

            return [
                'attendance_date_local' => $date,
                'total' => (int) ($row?->total ?? 0),
                'unique_people' => (int) ($row?->unique_people ?? 0),
            ];
        });

        // SMS is a central, unscoped model. Match the delivery log's role
        // restriction and explicitly constrain every count to this school.
        $smsFailures = $request->user()->isAdaptivestationAdmin()
            ? SmsOutboxMessage::query()
                ->where('tenant_id', $tenantId)
                ->where('status', SmsOutboxStatus::Failed)
                ->count()
            : null;

        return Inertia::render('Admin/dashboard/dashboard-screen', [
            'today' => $today->toDateString(),
            'timezone' => $timezone,
            'updatedAt' => $now->toIso8601String(),
            'stats' => [
                'person_count' => Person::query()->count(),
                'active_person_count' => Person::query()->where('is_active', true)->count(),
                'station_count' => Station::query()->count(),
                'active_station_count' => $enabledCount,
                'online_station_count' => $onlineCount,
                'offline_station_count' => $enabledCount - $onlineCount,
                'rfid_card_count' => RfidCard::query()->count(),
                'active_rfid_card_count' => RfidCard::query()->where('is_active', true)->count(),
                'taps_today' => $weeklyAttendance->last()['total'],
                'people_today' => $weeklyAttendance->last()['unique_people'],
                'sms_failures' => $smsFailures,
                'open_attendance_exception_count' => AttendanceException::query()->where('status', 'open')->count(),
                'pending_station_event_count' => (int) (clone $enabledStations)->sum('last_pending_count'),
            ],
            'stationHealth' => [
                'threshold_minutes' => $thresholdMinutes,
                'last_attendance_sync_at' => TapEvent::query()
                    ->where('source_system', 'adaptive_station')
                    ->latest('received_at')->first(['received_at'])?->received_at?->toIso8601String(),
                'offline_stations' => (clone $enabledStations)
                    ->where(fn ($query) => $query->whereNull('last_seen_at')->orWhere('last_seen_at', '<=', $cutoff))
                    ->orderBy('last_seen_at')->orderBy('name')
                    ->limit(5)->get(['id', 'name', 'station_code', 'last_seen_at'])
                    ->map(fn (Station $station): array => [
                        'id' => $station->id,
                        'name' => $station->name,
                        'station_code' => $station->station_code,
                        'last_seen_at' => $station->last_seen_at?->toIso8601String(),
                    ]),
            ],
            'recentActivity' => AuditLog::query()->latest('created_at')->take(8)->get(),
            'weeklyAttendance' => $weeklyAttendance,
        ]);
    }
}
