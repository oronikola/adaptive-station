<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\TapEvent;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Every query below is plain Model::query() with no allTenants() escape
     * hatch — SetTenantContext already pointed the 'tenant' connection and
     * TenantScope at this request's own tenant, so Person/Station/RfidCard/
     * TapEvent can only ever return this tenant's rows. AuditLog lives in the
     * shared central database, but the same TenantScope filters it down to
     * this tenant's own entries — never another school's.
     */
    public function index(): Response
    {
        $today = Date::today();

        return Inertia::render('admin/dashboard/dashboard-screen', [
            'stats' => [
                'person_count' => Person::query()->count(),
                'active_person_count' => Person::query()->where('is_active', true)->count(),
                'station_count' => Station::query()->count(),
                'active_station_count' => Station::query()->where('status', 'active')->count(),
                'rfid_card_count' => RfidCard::query()->count(),
                'active_rfid_card_count' => RfidCard::query()->where('is_active', true)->count(),
                'taps_today' => TapEvent::query()->whereDate('attendance_date_local', $today)->count(),
            ],
            'recentActivity' => AuditLog::query()
                ->latest('created_at')
                ->take(8)
                ->get(),
            'weeklyAttendance' => TapEvent::query()
                ->selectRaw('attendance_date_local, count(*) as total, count(distinct person_id) as unique_people')
                ->where('attendance_date_local', '>=', $today->copy()->subDays(6))
                ->groupBy('attendance_date_local')
                ->orderByDesc('attendance_date_local')
                ->get()
                ->map(fn (TapEvent $row) => [
                    'attendance_date_local' => $row->attendance_date_local->toDateString(),
                    'total' => (int) $row->total,
                    'unique_people' => (int) $row->unique_people,
                ]),
        ]);
    }
}
