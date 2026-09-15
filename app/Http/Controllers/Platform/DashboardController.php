<?php

namespace App\Http\Controllers\Platform;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
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
        ]);
    }
}
