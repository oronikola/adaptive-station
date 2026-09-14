<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Person;
use App\Models\Station;
use App\Models\TapEvent;
use Illuminate\Http\JsonResponse;
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

        // A tenant can have thousands of people — shipping the whole roster
        // as a page prop (the old behavior) doesn't scale. Only the one
        // currently-selected person (if any) needs to be resolved up front,
        // so the search box (peopleSearch() below) can show their name
        // without a roundtrip; every other match is looked up on demand.
        $selectedPerson = filled($filters['person_id'] ?? null)
            ? Person::query()->find($filters['person_id'], ['id', 'display_name', 'grade_level'])
            : null;

        return Inertia::render('Admin/attendance/attendance-search-screen', [
            'events' => $events,
            'filters' => $filters,
            'selectedPerson' => $selectedPerson,
            'stations' => Station::query()->orderBy('name')->get(['id', 'name']),
            'stats' => $this->stats($filters),
        ]);
    }

    /**
     * Backs the Person filter's search-as-you-type box — mirrors
     * ParentAccountController::students() but across every person type
     * (attendance covers staff taps too, not just students), scoped to this
     * page's own viewAny authorization rather than parent-creation's.
     */
    public function peopleSearch(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', TapEvent::class);

        $data = $request->validate(['search' => ['nullable', 'string', 'max:100']]);
        $search = $data['search'] ?? '';

        $people = Person::query()
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('display_name', 'like', '%'.$search.'%')
                ->orWhere('external_id', 'like', '%'.$search.'%')))
            ->orderBy('display_name')->orderBy('id')->limit(30)
            ->get(['id', 'display_name', 'grade_level']);

        return response()->json(['people' => $people]);
    }

    /**
     * Totals for the current filter set (not just the current page) — reuses
     * the same TapEvent::scopeSearch() filters as the row-level list above,
     * so the numbers can never disagree about what a given filter set means.
     *
     * @return array{total: int, unique_people: int, in: int, out: int}
     */
    private function stats(array $filters): array
    {
        $counts = TapEvent::search($filters)
            ->reorder()
            ->selectRaw('event_type, count(*) as aggregate, count(distinct person_id) as unique_people')
            ->groupBy('event_type')
            ->get()
            ->keyBy(fn ($row) => $row->event_type->value);

        return [
            'total' => (int) $counts->sum('aggregate'),
            'unique_people' => (int) TapEvent::search($filters)->reorder()->distinct('person_id')->count('person_id'),
            'in' => (int) ($counts['IN']->aggregate ?? 0),
            'out' => (int) ($counts['OUT']->aggregate ?? 0),
        ];
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

        return Inertia::render('Admin/attendance/attendance-summary-screen', [
            'summary' => $summary,
            'filters' => $filters,
            'stations' => Station::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Per-student, per-month "days present" counts for a calendar year.
     *
     * Deliberately does not compute an "absent" count: that requires knowing
     * which days were actual school days (holidays, breaks, weekends), and
     * there is no school-calendar model in this app to answer that — only
     * raw tap events. Showing an "absent" figure without one would silently
     * misreport every non-school day as an absence.
     */
    public function studentSummary(Request $request, Person $person): Response
    {
        Gate::authorize('viewAny', TapEvent::class);
        Gate::authorize('view', $person);

        $years = TapEvent::query()
            ->where('person_id', $person->id)
            ->selectRaw('DISTINCT YEAR(attendance_date_local) as year')
            ->orderByDesc('year')
            ->pluck('year');

        $year = (int) $request->integer('year', $years->first() ?? now()->year);

        $daysPresentByMonth = TapEvent::query()
            ->where('person_id', $person->id)
            ->whereYear('attendance_date_local', $year)
            ->selectRaw('MONTH(attendance_date_local) as month, COUNT(DISTINCT attendance_date_local) as days_present')
            ->groupBy('month')
            ->pluck('days_present', 'month');

        $months = collect(range(1, 12))->map(fn (int $month) => [
            'month' => $month,
            'label' => now()->setDate($year, $month, 1)->format('F'),
            'days_present' => (int) ($daysPresentByMonth[$month] ?? 0),
        ]);

        return Inertia::render('Admin/attendance/attendance-student-summary-screen', [
            'person' => $person,
            'year' => $year,
            'years' => $years,
            'months' => $months,
            'totalDaysPresent' => $months->sum('days_present'),
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
