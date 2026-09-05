<?php

namespace App\Http\Controllers\Platform;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Tenant::class);

        $stationTotals = Tenant::platformStationTotals();

        return Inertia::render('Platform/dashboard/dashboard-screen', [
            'stats' => [
                'tenant_count' => Tenant::query()->count(),
                'active_tenant_count' => Tenant::query()->where('status', TenantStatus::Active)->count(),
                'station_count' => $stationTotals['total'],
                'active_station_count' => $stationTotals['active'],
            ],
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
