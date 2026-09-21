<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Http\Request;
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

        $query = AuditLog::allTenants()
            ->with('tenant:id,name')
            ->where('action', 'like', 'parent.credentials_self_service_%')
            ->when($filters['tenant_id'] ?? null, fn ($q, $tenantId) => $q->where('tenant_id', $tenantId))
            ->when($filters['outcome'] ?? null, fn ($q, $outcome) => $q->where('action', "parent.credentials_self_service_{$outcome}"))
            ->when($filters['date_from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date));

        $requests = $query->latest('created_at')
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
            'stats' => $this->stats(),
        ]);
    }

    /**
     * Always scoped to every request across every school, independent of the
     * current filters — a permanent overview, not a filtered count. Mirrors
     * Platform\SmsDeliveryLogController::stats()'s same reasoning.
     *
     * @return array<string, int>
     */
    private function stats(): array
    {
        $counts = AuditLog::allTenants()
            ->where('action', 'like', 'parent.credentials_self_service_%')
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

        return $stats;
    }
}
