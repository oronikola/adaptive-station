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

/**
 * Read-only, cross-school view of every /parents/credentials "send
 * credentials" attempt (see ParentCredentialLookupController::send()'s
 * logOutcome()) — not just the ones that queued an SMS, but every reason one
 * didn't: no phone on file, no student linked to the account yet, rate
 * limited, or a within-5-minutes duplicate click. Before this screen, none
 * of those failure paths left anything a superadmin could see; the request
 * just 422'd and vanished. Reuses audit_logs (queried the same way
 * Platform\AuditLogController does) rather than a dedicated table, since
 * this is exactly what that table is for.
 */
class CredentialRequestLogController extends Controller
{
    private const OUTCOMES = ['queued', 'duplicate', 'no_phone', 'no_students_linked', 'rate_limited'];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', AuditLog::class);

        $filters = $request->only(['tenant_id', 'outcome', 'date_from', 'date_to']);

        $requests = $this->scopedQuery($filters)
            ->latest('created_at')
            ->paginate(50)
            ->withQueryString()
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'tenant' => $log->tenant ? ['name' => $log->tenant->name] : null,
                'outcome' => str($log->action)->after('parent.credentials_self_service_')->toString(),
                'parent_name' => $log->metadata['parent_name'] ?? null,
                'masked_phone' => $log->metadata['masked_phone'] ?? null,
                'created_at' => $log->created_at,
            ]);

        return Inertia::render('Platform/credential-requests/credential-request-log-screen', [
            'requests' => $requests,
            'tenants' => Tenant::query()->orderBy('name')->get(['id', 'name']),
            'filters' => $filters,
            'stats' => $this->stats($filters),
            'trend' => $this->trend($filters),
            'schoolAnalytics' => $this->schoolAnalytics($filters),
        ]);
    }

    /**
     * The one query builder every part of this screen shares — the request
     * table, the stat cards, the trend chart, and the per-school breakdown
     * all resolve the same filters, so the whole page stays in sync as the
     * school/outcome/date filters change. The trend silently widens the date
     * range to its own default window (see trend()) via $dateRange, but the
     * school and outcome filters are never overridden there.
     */
    private function scopedQuery(array $filters, ?array $dateRange = null): Builder
    {
        $dates = $dateRange ?? $filters;

        return AuditLog::allTenants()
            ->with('tenant:id,name')
            ->where('action', 'like', 'parent.credentials_self_service_%')
            ->when($filters['tenant_id'] ?? null, fn ($q, $tenantId) => $q->where('tenant_id', $tenantId))
            ->when($filters['outcome'] ?? null, fn ($q, $outcome) => $q->where('action', "parent.credentials_self_service_{$outcome}"))
            ->when($dates['date_from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($dates['date_to'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date));
    }

    /**
     * Scoped to the current filters (unlike the old all-time permanent
     * overview) so the grid reads as one set with the panals and table
     * around it. success_rate is queued over total — the one number that
     * tells whether the self-service credential lookup is actually working.
     *
     * @return array<string, int|float>
     */
    private function stats(array $filters): array
    {
        $counts = $this->scopedQuery($filters)
            ->selectRaw('action, count(*) as aggregate')
            ->groupBy('action')
            ->get()
            ->mapWithKeys(fn ($row) => [
                str($row->action)->after('parent.credentials_self_service_')->toString() => (int) $row->aggregate,
            ]);

        $stats = ['total' => 0];

        foreach (self::OUTCOMES as $outcome) {
            $stats[$outcome] = $counts[$outcome] ?? 0;
            $stats['total'] += $stats[$outcome];
        }

        $stats['success_rate'] = $stats['total'] > 0
            ? round(($stats['queued'] / $stats['total']) * 100, 1)
            : 0.0;

        return $stats;
    }

    /**
     * Outcome mix over time for a "is this getting better or worse" view.
     * Bucketed daily by default (last 90 days when no date filter is set),
     * collapsing to monthly once a filter spans more than ~3 months so the
     * chart never grows past a readable number of bars. Left-aligned,
     * zero-filled so a quiet day still appears instead of the line skipping
     * it. Bytes are bucketed by creator storage day (created_at, UTC) — the
     * same denominator the date filters themselves use.
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
            ->selectRaw("{$expression} as bucket, action, count(*) as aggregate")
            ->groupBy('bucket', 'action')
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

        foreach (self::OUTCOMES as $outcome) {
            $count = (int) ($rows->firstWhere('action', "parent.credentials_self_service_{$outcome}")?->aggregate ?? 0);
            $point[$outcome] = $count;
            $point['total'] += $count;
        }

        return $point;
    }

    /**
     * Per-school ranking for "which schools are actually making parents
     * re-request credentials (read: struggling)" — request volume and the
     * share that actually queued an SMS. Top 10 by volume, filter-aware
     * (a tenant filter pares this to that one school; an outcome filter
     * narrows each school's mix the same way it narrows the table).
     *
     * @return array<int, array{id: string, name: string, total: int, queued: int, success_rate: float}>
     */
    private function schoolAnalytics(array $filters): array
    {
        $rows = $this->scopedQuery($filters)
            ->selectRaw('tenant_id, action, count(*) as aggregate')
            ->groupBy('tenant_id', 'action')
            ->get()
            ->groupBy('tenant_id');

        $names = Tenant::query()->whereIn('id', $rows->keys())->pluck('name', 'id');

        return $rows
            ->map(fn (Collection $group, $tenantId): array => $this->schoolRow($tenantId, $group, $names))
            ->sortByDesc('total')
            ->take(10)
            ->values()
            ->all();
    }

    /** @return array{id: string, name: string, total: int, queued: int, success_rate: float} */
    private function schoolRow(mixed $tenantId, Collection $group, Collection $names): array
    {
        $total = 0;
        $queued = 0;

        foreach (self::OUTCOMES as $outcome) {
            $count = (int) ($group->firstWhere('action', "parent.credentials_self_service_{$outcome}")?->aggregate ?? 0);
            $total += $count;
            if ($outcome === 'queued') {
                $queued = $count;
            }
        }

        return [
            'id' => (string) $tenantId,
            'name' => (string) ($names->get($tenantId) ?? 'Unknown school'),
            'total' => $total,
            'queued' => $queued,
            'success_rate' => $total > 0 ? round(($queued / $total) * 100, 1) : 0.0,
        ];
    }
}
