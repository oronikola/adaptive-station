<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Person;
use App\Models\Station;
use App\Models\TapEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', TapEvent::class);

        $filters = $request->only(['date_from', 'date_to', 'person_id', 'card_uid', 'station_id', 'event_type']);

        $events = TapEvent::search($filters)
            ->with(['person', 'station'])
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('admin/attendance/attendance-search-screen', [
            'events' => $events,
            'filters' => $filters,
            'people' => Person::query()->orderBy('last_name')->get(['id', 'display_name']),
            'stations' => Station::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Grouped daily counts — distinct from the row-level search above, and
     * distinct from CSV export; reuses the same TapEvent::scopeSearch()
     * filters (minus person/card, which don't fit a grouped view) so search
     * and summary never disagree about what a given filter set means.
     */
    public function summary(Request $request): Response
    {
        Gate::authorize('viewAny', TapEvent::class);

        $filters = $request->only(['date_from', 'date_to', 'station_id', 'event_type']);

        $summary = TapEvent::search($filters)
            ->reorder()
            ->selectRaw('attendance_date_local, count(*) as total, count(distinct person_id) as unique_people')
            ->groupBy('attendance_date_local')
            ->orderByDesc('attendance_date_local')
            ->paginate(31)
            ->withQueryString()
            ->through(fn (TapEvent $row) => [
                'attendance_date_local' => $row->attendance_date_local->toDateString(),
                'total' => (int) $row->total,
                'unique_people' => (int) $row->unique_people,
            ]);

        return Inertia::render('admin/attendance/attendance-summary-screen', [
            'summary' => $summary,
            'filters' => $filters,
            'stations' => Station::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        Gate::authorize('viewAny', TapEvent::class);

        $filters = $request->only(['date_from', 'date_to', 'person_id', 'card_uid', 'station_id', 'event_type']);

        return response()->streamDownload(function () use ($filters) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Time (UTC)', 'Person', 'Card UID', 'Station', 'Event Type']);

            TapEvent::search($filters)->with(['person', 'station'])->cursor()->each(function (TapEvent $event) use ($handle) {
                fputcsv($handle, [
                    $event->attendance_date_local->toDateString(),
                    $event->occurred_at->toIso8601String(),
                    $event->person?->display_name ?? '',
                    $event->card_uid,
                    $event->station?->name ?? '',
                    $event->event_type->value,
                ]);
            });

            fclose($handle);
        }, 'attendance-export.csv', ['Content-Type' => 'text/csv']);
    }
}
