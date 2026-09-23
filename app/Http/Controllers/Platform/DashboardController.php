<?php

namespace App\Http\Controllers\Platform;

use App\Enums\SmsOutboxStatus;
use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Tenant::class);

        $tenants = Tenant::query()
            ->orderBy('created_at')
            ->get(['id', 'status', 'created_at']);
        $stationTotals = Tenant::platformStationTotals();
        $thirtyDaysAgo = Date::now()->subDays(30);
        $weekEndings = collect(range(7, 0))->map(
            fn (int $weeksAgo) => Date::now()->subWeeks($weeksAgo)->endOfDay(),
        );

        $growth = $weekEndings->map(function ($weekEnd) use ($tenants) {
            $onboarded = $tenants->filter(
                fn (Tenant $tenant) => $tenant->created_at->lte($weekEnd),
            );

            return [
                'date' => $weekEnd->toDateString(),
                'total' => $onboarded->count(),
                'active' => $onboarded->where('status', TenantStatus::Active)->count(),
            ];
        })->values();

        return Inertia::render('Platform/dashboard/dashboard-screen', [
            'stats' => [
                'tenant_count' => $tenants->count(),
                'active_tenant_count' => $tenants->where('status', TenantStatus::Active)->count(),
                'inactive_tenant_count' => $tenants->whereIn('status', [TenantStatus::Suspended, TenantStatus::Archived])->count(),
                'new_tenant_count' => $tenants->where('created_at', '>=', $thirtyDaysAgo)->count(),
                'station_count' => $stationTotals['total'],
                'active_station_count' => $stationTotals['active'],
                'pending_station_count' => $stationTotals['pending_activation'],
                'disabled_station_count' => $stationTotals['disabled'],
                'retired_station_count' => $stationTotals['retired'],
                'online_station_count' => $stationTotals['online'],
                'offline_station_count' => $stationTotals['offline'],
            ],
            'statusCounts' => [
                'active' => $tenants->where('status', TenantStatus::Active)->count(),
                'suspended' => $tenants->where('status', TenantStatus::Suspended)->count(),
                'archived' => $tenants->where('status', TenantStatus::Archived)->count(),
            ],
            'growth' => $growth,
            'recentActivity' => AuditLog::allTenants()
                ->with('tenant:id,name')
                ->latest('created_at')
                ->take(8)
                ->get(),
            'recentClients' => Tenant::query()
                ->latest('created_at')
                ->take(5)
                ->get(),
            'smsHealth' => $this->smsFleetHealth(),
        ]);
    }

    /**
     * Fleet-wide SMS delivery picture for the platform dashboard — the same
     * aggregates the SMS Delivery Log page computes, without any tenant
     * scope. sms_outbox is a central table (see its model docblock), so this
     * is one query across every school.
     *
     * @return array{
     *   stats: array{total: int, pending: int, sent: int, delivered: int, failed: int},
     *   failureSummary: array<int, array{category: string, count: int}>,
     * }
     */
    private function smsFleetHealth(): array
    {
        $counts = SmsOutboxMessage::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->status->value => (int) $row->aggregate]);

        $stats = [
            'total' => $counts->sum(),
            'pending' => ($counts['pending'] ?? 0) + ($counts['claimed'] ?? 0),
            'sent' => $counts['sent'] ?? 0,
            'delivered' => $counts['delivered'] ?? 0,
            'failed' => ($counts['failed'] ?? 0) + ($counts['expired'] ?? 0),
        ];

        $failureSummary = SmsOutboxMessage::query()
            ->where('status', SmsOutboxStatus::Failed)
            ->whereNotNull('failure_category')
            ->selectRaw('failure_category, count(*) as aggregate')
            ->groupBy('failure_category')
            ->orderByDesc('aggregate')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['category' => $row->failure_category, 'count' => (int) $row->aggregate])
            ->all();

        return [
            'stats' => $stats,
            'failureSummary' => $failureSummary,
        ];
    }
}
