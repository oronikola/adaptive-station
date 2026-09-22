<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
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

        // A first tap from an Essentiel card can predate local card
        // provisioning, leaving person_id null on the immutable event. Once
        // the resolver has provisioned the card, use that current assignment
        // as a read-time fallback so existing attendance rows are recognized.
        $unresolvedCardUids = $events->getCollection()
            ->filter(fn (TapEvent $event): bool => $event->person === null)
            ->pluck('card_uid')
            ->unique()
            ->values();

        if ($unresolvedCardUids->isNotEmpty()) {
            $peopleByCardUid = RfidCard::query()
                ->whereIn('card_uid', $unresolvedCardUids)
                ->where('is_active', true)
                ->with('person')
                ->get()
                ->mapWithKeys(fn (RfidCard $card): array => [$card->card_uid => $card->person])
                ->filter();

            $events->getCollection()->each(function (TapEvent $event) use ($peopleByCardUid): void {
                if ($event->person === null && $peopleByCardUid->has($event->card_uid)) {
                    $event->setRelation('person', $peopleByCardUid->get($event->card_uid));
                }
            });
        }

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
            'analytics' => $this->analytics($filters),
            'todayStats' => $this->todayStats(),
        ]);
    }

    /**
     * Today's tap totals, independent of whatever search filters are
     * active — the search filters answer "how many taps match this
     * query", but this answers a fixed question ("how many people have
     * tapped in/out today") that a filtered view shouldn't quietly change
     * the meaning of. "Today" is the tenant's own local calendar date
     * (matching how attendance_date_local is stored), not the server's.
     *
     * @return array{in: int, out: int}
     */
    private function todayStats(): array
    {
        $tenantId = app(TenantContext::class)->get();
        $timezone = Tenant::findOrFail($tenantId)->timezone;
        $today = Date::now()->setTimezone($timezone)->toDateString();

        $counts = TapEvent::query()
            ->where('attendance_date_local', $today)
            ->selectRaw('event_type, count(*) as aggregate')
            ->groupBy('event_type')
            ->get()
            ->keyBy(fn ($row) => $row->event_type->value);

        return [
            'in' => (int) ($counts['IN']->aggregate ?? 0),
            'out' => (int) ($counts['OUT']->aggregate ?? 0),
        ];
    }

    /**
     * Aggregate the complete filtered result, independently of pagination.
     * Calendar buckets use the stored school-local attendance date.
     *
     * @return array<string, mixed>
     */
    private function analytics(array $filters): array
    {
        $query = TapEvent::search($filters)->reorder();
        $bounds = (clone $query)->toBase()
            ->selectRaw('MIN(attendance_date_local) as first_date, MAX(attendance_date_local) as last_date, COUNT(DISTINCT attendance_date_local) as recorded_days, COUNT(*) as total')
            ->first();

        if ((int) $bounds->recorded_days === 0) {
            return ['recorded_days' => 0, 'average_taps' => 0, 'busiest_day' => null, 'granularity' => 'day', 'date_from' => null, 'date_to' => null, 'trend' => [], 'stations' => []];
        }

        $first = Date::parse($bounds->first_date);
        $last = Date::parse($bounds->last_date);
        $granularity = 'day';
        $format = '%Y-%m-%d';
        if ($first->diffInDays($last) >= 31) {
            $granularity = 'month';
            $format = '%Y-%m-01';
            if ($first->copy()->startOfMonth()->diffInMonths($last->copy()->startOfMonth()) >= 24) {
                $granularity = 'year';
                $format = '%Y-01-01';
            }
        }

        $counts = (clone $query)->toBase()
            ->selectRaw("DATE_FORMAT(attendance_date_local, ?) as period_start, COUNT(*) as total, COUNT(DISTINCT person_id) as unique_people, SUM(CASE WHEN event_type = 'IN' THEN 1 ELSE 0 END) as taps_in, SUM(CASE WHEN event_type = 'OUT' THEN 1 ELSE 0 END) as taps_out", [$format])
            ->groupBy('period_start')->orderBy('period_start')->get()->keyBy('period_start');

        $trend = [];
        $cursor = $first->copy()->startOf($granularity);
        while ($cursor->lte($last)) {
            $key = $cursor->toDateString();
            $row = $counts->get($key);
            $trend[] = [
                'date' => $key,
                'total' => (int) ($row?->total ?? 0),
                'unique_people' => (int) ($row?->unique_people ?? 0),
                'in' => (int) ($row?->taps_in ?? 0),
                'out' => (int) ($row?->taps_out ?? 0),
            ];
            $cursor->addUnit($granularity);
        }

        $busiest = (clone $query)->toBase()
            ->selectRaw('attendance_date_local as date, COUNT(*) as total')
            ->groupBy('attendance_date_local')->orderByDesc('total')->orderByDesc('attendance_date_local')->first();

        $stations = (clone $query)->selectRaw('station_id, COUNT(*) as total')
            ->groupBy('station_id')->orderByDesc('total')->orderBy('station_id')
            ->with('station:id,name')->limit(5)->get()
            ->map(fn (TapEvent $row): array => [
                'id' => $row->station_id,
                'name' => $row->station?->name ?? 'Unknown station',
                'total' => (int) $row->total,
            ]);

        return [
            'recorded_days' => (int) $bounds->recorded_days,
            'average_taps' => round((int) $bounds->total / (int) $bounds->recorded_days, 1),
            'busiest_day' => ['date' => $busiest->date, 'total' => (int) $busiest->total],
            'granularity' => $granularity,
            'date_from' => $first->toDateString(),
            'date_to' => $last->toDateString(),
            'trend' => $trend,
            'stations' => $stations,
        ];
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
