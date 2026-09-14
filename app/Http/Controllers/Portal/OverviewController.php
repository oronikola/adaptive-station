<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Station;
use App\Models\TapEvent;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OverviewController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', TapEvent::class);

        $thresholdMinutes = (int) config('device.station_offline_threshold_minutes');
        $stations = Station::query()->get(['id', 'name', 'status', 'last_seen_at', 'last_pending_count']);

        $today = TapEvent::query()
            ->selectRaw('count(*) as total, count(distinct person_id) as unique_people')
            ->where('attendance_date_local', Date::now()->toDateString())
            ->first();

        $dailyPerformance = TapEvent::query()
            ->selectRaw('attendance_date_local, count(*) as total, count(distinct person_id) as unique_people')
            ->where('attendance_date_local', '>=', Date::now()->subDays(13)->toDateString())
            ->groupBy('attendance_date_local')
            ->orderBy('attendance_date_local')
            ->get()
            ->map(fn (TapEvent $row) => [
                'date' => $row->attendance_date_local->toDateString(),
                'total' => (int) $row->total,
                'unique_people' => (int) $row->unique_people,
            ]);

        return Inertia::render('admin/overview/overview-screen', [
            'stats' => [
                'station_count' => $stations->count(),
                'active_station_count' => $stations->where('status', 'active')->count(),
                'taps_today' => (int) ($today->total ?? 0),
                'people_today' => (int) ($today->unique_people ?? 0),
                'pending_sync' => (int) $stations->sum('last_pending_count'),
            ],
            'dailyPerformance' => $dailyPerformance,
            'stations' => $stations
                ->sortByDesc(fn (Station $station) => $station->last_seen_at)
                ->take(6)
                ->values()
                ->map(fn (Station $station) => [
                    'id' => $station->id,
                    'name' => $station->name,
                    'status' => $station->status->value,
                    'last_seen_at' => $station->last_seen_at?->toIso8601String(),
                    'last_pending_count' => $station->last_pending_count,
                    'is_online' => $station->status->value === 'active'
                        && $station->last_seen_at !== null
                        && $station->last_seen_at->gt(Date::now()->subMinutes($thresholdMinutes)),
                ]),
        ]);
    }
}
