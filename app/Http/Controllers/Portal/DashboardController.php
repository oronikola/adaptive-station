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
use Illuminate\Support\Carbon;
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
        $canViewSms = $request->user()->isAdaptivestationAdmin();

        $enabledStations = Station::query()->where('status', StationStatus::Active);
        $enabledCount = (clone $enabledStations)->count();
        $onlineCount = (clone $enabledStations)->where('last_seen_at', '>', $cutoff)->count();

        $attendance = TapEvent::query()
            ->selectRaw("attendance_date_local, count(*) as total, count(distinct person_id) as unique_people, sum(case when event_type = 'IN' then 1 else 0 end) as taps_in, sum(case when event_type = 'OUT' then 1 else 0 end) as taps_out")
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
                'in' => (int) ($row?->taps_in ?? 0),
                'out' => (int) ($row?->taps_out ?? 0),
            ];
        });

        // SMS is a central, unscoped model. Match the delivery log's role
        // restriction and explicitly constrain every count to this school.
        $smsFailures = $canViewSms
            ? SmsOutboxMessage::query()
                ->where('tenant_id', $tenantId)
                ->where('status', SmsOutboxStatus::Failed)
                ->count()
            : null;

        // Same role gate as the delivery log — the SMS delivery-health tile
        // (status distribution + top failure reason) is only meaningful to a
        // user who can actually reach that page. Kept all-time to stay in
        // sync with the sms_failures metric card and the log's own stats().
        $smsHealth = $canViewSms
            ? $this->smsHealth($tenantId)
            : null;

        // Attendance is per-station on this tenant's own database, so per-
        // station volume uses the same 7-day window as weeklyAttendance.
        $stationVolume = $this->stationVolume($today);

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
            'smsHealth' => $smsHealth,
            'stationVolume' => $stationVolume,
        ]);
    }

    /**
     * Same shape as Portal\SmsDeliveryLogController::stats() — claimed folds
     * into "pending" (still in flight), expired folds into "failed" (never
     * reached the phone) — plus the school's top dead-letter failure reason.
     * Always scoped to this tenant and independent of any filters, matching
     * the dashboard's other permanent overviews.
     *
     * @return array{total: int, pending: int, sent: int, delivered: int, failed: int, topFailure: array{category: string, count: int}|null}
     */
    private function smsHealth(?string $tenantId): array
    {
        $counts = SmsOutboxMessage::query()
            ->where('tenant_id', $tenantId)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->status->value => (int) $row->aggregate]);

        $topFailure = SmsOutboxMessage::query()
            ->where('tenant_id', $tenantId)
            ->where('status', SmsOutboxStatus::Failed)
            ->whereNotNull('failure_category')
            ->selectRaw('failure_category, count(*) as aggregate')
            ->groupBy('failure_category')
            ->orderByDesc('aggregate')
            ->first();

        return [
            'total' => $counts->sum(),
            'pending' => ($counts['pending'] ?? 0) + ($counts['claimed'] ?? 0),
            'sent' => $counts['sent'] ?? 0,
            'delivered' => $counts['delivered'] ?? 0,
            'failed' => ($counts['failed'] ?? 0) + ($counts['expired'] ?? 0),
            'topFailure' => $topFailure !== null
                ? ['category' => $topFailure->failure_category, 'count' => (int) $topFailure->aggregate]
                : null,
        ];
    }

    /**
     * Tap volume per station over the same 7-day window as the attendance
     * chart, for a "where is activity actually happening" comparison across
     * this school's fleet. Stations with zero taps are omitted — like
     * SMS deviceStats, a row sitting at 0 adds noise without meaning.
     *
     * @return array<int, array{id: string, name: string, station_code: string, total: int}>
     */
    private function stationVolume(Carbon $today): array
    {
        $counts = TapEvent::query()
            ->selectRaw('station_id, count(*) as total')
            ->whereBetween('attendance_date_local', [$today->copy()->subDays(6)->toDateString(), $today->toDateString()])
            ->groupBy('station_id')
            ->get()
            ->keyBy('station_id');

        return Station::query()
            ->get(['id', 'name', 'station_code'])
            ->map(fn (Station $station): array => [
                'id' => $station->id,
                'name' => $station->name,
                'station_code' => $station->station_code,
                'total' => (int) ($counts->get($station->id)?->total ?? 0),
            ])
            ->filter(fn (array $row): bool => $row['total'] > 0)
            ->sortByDesc('total')
            ->take(8)
            ->values()
            ->all();
    }
}
