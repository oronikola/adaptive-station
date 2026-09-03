<?php

namespace App\Http\Controllers\Platform;

use App\Enums\TenantStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreTenantAdminRequest;
use App\Http\Requests\Platform\StoreTenantRequest;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Tenant::class);

        $tenants = Tenant::query()
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('superadmin/tenants/tenants-list-screen', [
            'tenants' => $tenants,
            'stats' => [
                'tenant_count' => Tenant::query()->count(),
                'active_tenant_count' => Tenant::query()->where('status', TenantStatus::Active)->count(),
                'station_count' => Station::allTenants()->count(),
                'active_station_count' => Station::allTenants()->where('status', 'active')->count(),
            ],
        ]);
    }

    public function store(StoreTenantRequest $request): RedirectResponse
    {
        $tenant = Tenant::provision($request->validated(), $request->user());

        return redirect()->route('platform.tenants.show', $tenant)->with('success', 'Tenant created.');
    }

    public function show(Tenant $tenant): Response
    {
        Gate::authorize('view', $tenant);

        return Inertia::render('superadmin/tenants/tenant-detail-screen', [
            'tenant' => $tenant,
            'admins' => $tenant->users()->where('role', 'tenant_admin')->orderBy('name')->get(),
            'stations' => $tenant->stations()->orderBy('name')->get(),
        ]);
    }

    public function storeAdmin(StoreTenantAdminRequest $request, Tenant $tenant): RedirectResponse
    {
        ['temporary_password' => $temporaryPassword] = User::provisionForTenant(
            $tenant,
            UserRole::TenantAdmin,
            $request->validated(),
            $request->user(),
        );

        return redirect()->route('platform.tenants.show', $tenant)
            ->with('success', 'Admin account created.')
            ->with('temporaryPassword', $temporaryPassword);
    }

    public function updateStatus(Request $request, Tenant $tenant): RedirectResponse
    {
        Gate::authorize('update', $tenant);

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended'],
        ]);

        Tenant::updateStatus($tenant, TenantStatus::from($data['status']), $request->user());

        return redirect()->route('platform.tenants.show', $tenant)->with('success', 'Tenant status updated.');
    }
}
