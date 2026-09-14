<?php

namespace App\Http\Controllers\Platform;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\Station;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OverviewController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Tenant::class);

        $tenants = Tenant::query()->orderBy('created_at')->get(['id', 'name', 'code', 'status', 'timezone', 'created_at']);

        // Stations live one physical database per tenant — there is no single
        // query that counts across all of them, so this loops every tenant's
        // own database and sums in PHP (same approach as TenantController::index).
        $stationCount = 0;
        $activeStationCount = 0;
        foreach ($tenants as $tenant) {
            TenantDatabase::use($tenant);
            $stationCount += Station::allTenants()->count();
            $activeStationCount += Station::allTenants()->where('status', 'active')->count();
        }

        // Weekly cumulative onboarding trend, computed in PHP rather than a
        // grouped SQL query so the growth curve stays portable across the
        // app's MySQL connection and SQLite test connection.
        $weekEndings = collect(range(7, 0))->map(fn (int $weeksAgo) => Date::now()->subWeeks($weeksAgo)->endOfDay());
        $growth = $weekEndings->map(function ($weekEnd) use ($tenants) {
            $onboarded = $tenants->filter(fn (Tenant $tenant) => $tenant->created_at->lte($weekEnd));

            return [
                'date' => $weekEnd->toDateString(),
                'total' => $onboarded->count(),
                'active' => $onboarded->where('status', TenantStatus::Active)->count(),
            ];
        })->values();

        $recentTenants = $tenants->sortByDesc('created_at')->take(6)->values()->map(function (Tenant $tenant) {
            TenantDatabase::use($tenant);

            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'code' => $tenant->code,
                'status' => $tenant->status->value,
                'timezone' => $tenant->timezone,
                'created_at' => $tenant->created_at->toIso8601String(),
                'station_count' => Station::allTenants()->count(),
            ];
        });

        return Inertia::render('superadmin/overview/overview-screen', [
            'stats' => [
                'tenant_count' => $tenants->count(),
                'active_tenant_count' => $tenants->where('status', TenantStatus::Active)->count(),
                'station_count' => $stationCount,
                'active_station_count' => $activeStationCount,
            ],
            'growth' => $growth,
            'recentTenants' => $recentTenants,
        ]);
    }
}
