<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    private const ACTOR_TYPES = ['user', 'station', 'parent_account', 'system'];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', AuditLog::class);

        $filters = $request->only(['search', 'actor_type', 'date_from', 'date_to']);

        $logs = $this->scopedQuery($filters)
            ->latest('created_at')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Platform/audit-log/audit-log-list-screen', [
            'logs' => $logs,
            'filters' => $filters,
            'stats' => $this->stats($filters),
            'trend' => $this->trend($filters),
            'schoolAnalytics' => $this->schoolAnalytics($filters),
        ]);
    }

    /**
     * The one query builder the table, stat cards, trend chart, and per-school
     * breakdown all share, so every section resolves the same filters and
     * stays in sync as they change. The trend may widen the date range to its
     * default window via $dateRange, but the search/actor filters are never
     * overridden there.
     */
    private function scopedQuery(array $filters, ?array $dateRange = null): Builder
    {
        $dates = $dateRange ?? $filters;

        return AuditLog::allTenants()
            ->with('tenant:id,name')
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('action', 'like', '%'.$search.'%'))
            ->when($filters['actor_type'] ?? null, fn ($q, $actorType) => $q->where('actor_type', $actorType))
            ->when($dates['date_from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($dates['date_to'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date));
    }

    /**
     * Filter-aware volume per actor type — who is driving the platform's
     * activity within the current filters (humans vs. stations vs. the
     * background system) — plus each actor's share of that total.
     *
     * @return array<string, int>
     */
    private function stats(array $filters): array
    {
        $counts = $this->scopedQuery($filters)
            ->selectRaw('actor_type, count(*) as aggregate')
            ->groupBy('actor_type')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->actor_type->value => (int) $row->aggregate]);

        $stats = ['total' => 0];

        foreach (self::ACTOR_TYPES as $type) {
            $stats[$type] = $counts[$type] ?? 0;
            $stats['total'] += $stats[$type];
        }

        return $stats;
    }

    /**
     * Activity volume over time for a "what is the platform doing lately"
     * view, stacked by actor type. Bucketed daily by default (last 90 days
     * when no date filter is set), collapsing to monthly once a filter spans
     * more than ~3 months. Left-aligned and zero-filled so quiet stretches
     * still render. Bucketed by created_at (UTC) — the same denominator the
     * date filters use.
     *
     * @return array{granularity: string, range: array{date_from: string, date_to: string}, points: array<int, array<string, int|string>>}
     */
    private function trend(array $filters): array
    {
        $now = Date::now();
        $range = [
            'date_from' => isset($filters['date_from'])
                ? Carbon::parse($filters['date_from'])->toDateString()
                : $now->copy()->subDays(89)->toDateString(),
            'date_to' => isset($filters['date_to'])
                ? Carbon::parse($filters['date_to'])->toDateString()
                : $now->toDateString(),
        ];

        $from = Carbon::parse($range['date_from']);
        $to = Carbon::parse($range['date_to']);
        $granularity = $from->diffInDays($to) <= 92 ? 'day' : 'month';
        $expression = $granularity === 'day'
            ? "DATE_FORMAT(created_at, '%Y-%m-%d')"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $rows = $this->scopedQuery($filters, $range)
            ->selectRaw("{$expression} as bucket, actor_type, count(*) as aggregate")
            ->groupBy('bucket', 'actor_type')
            ->get()
            ->groupBy('bucket');

        $points = collect();
        if ($granularity === 'day') {
            for ($cursor = $from->copy(); $cursor->lte($to); $cursor->addDay()) {
                $points->push($this->trendPoint($cursor->toDateString(), $rows->get($cursor->toDateString(), collect())));
            }
        } else {
            for ($cursor = $from->copy()->firstOfMonth(); $cursor->format('Y-m') <= $to->format('Y-m'); $cursor->addMonth()) {
                $points->push($this->trendPoint($cursor->format('Y-m'), $rows->get($cursor->format('Y-m'), collect())));
            }
        }

        return ['granularity' => $granularity, 'range' => $range, 'points' => $points->all()];
    }

    /** @return array<string, int> */
    private function trendPoint(string $bucket, Collection $rows): array
    {
        $point = ['bucket' => $bucket, 'total' => 0];

        foreach (self::ACTOR_TYPES as $type) {
            $count = (int) ($rows->firstWhere('actor_type', $type)?->aggregate ?? 0);
            $point[$type] = $count;
            $point['total'] += $count;
        }

        return $point;
    }

    /**
     * Per-school activity ranking — school tenant events only (platform-wide
     * rows have a null tenant_id and are excluded) — with each school's share
     * of the filtered total. Top 10 by volume, filter-aware like the rest of
     * the screen.
     *
     * @return array<int, array{id: string, name: string, total: int, share: float}>
     */
    private function schoolAnalytics(array $filters): array
    {
        $rows = $this->scopedQuery($filters)
            ->selectRaw('tenant_id, count(*) as aggregate')
            ->whereNotNull('tenant_id')
            ->groupBy('tenant_id')
            ->get();

        $names = Tenant::query()->whereIn('id', $rows->pluck('tenant_id'))->pluck('name', 'id');
        $totalAcross = (int) $rows->sum('aggregate');

        return $rows
            ->map(fn ($row): array => [
                'id' => (string) $row->tenant_id,
                'name' => (string) ($names->get($row->tenant_id) ?? 'Unknown school'),
                'total' => (int) $row->aggregate,
                'share' => $totalAcross > 0 ? round((($row->aggregate ?? 0) / $totalAcross) * 100, 1) : 0.0,
            ])
            ->sortByDesc('total')
            ->take(10)
            ->values()
            ->all();
    }
}
