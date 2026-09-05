<?php

namespace App\Http\Controllers\Platform;

use App\Enums\TenantStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\DestroyTenantRequest;
use App\Http\Requests\Platform\StoreTenantAdminRequest;
use App\Http\Requests\Platform\StoreTenantRequest;
use App\Http\Requests\Platform\UpdateTenantAdminRequest;
use App\Models\AuditLog;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Tenant::class);

        $filters = $request->only(['search', 'status']);

        $tenants = Tenant::query()
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('superadmin/tenants/tenants-list-screen', [
            'tenants' => $tenants,
            'filters' => $filters,
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

        // Station lives on the 'tenant' connection — must point it at this
        // specific tenant's database before querying its stations, since a
        // platform request has no tenant of its own to have already
        // switched it via SetTenantContext.
        TenantDatabase::use($tenant);

        return Inertia::render('superadmin/tenants/tenant-detail-screen', [
            'tenant' => $tenant,
            // password_plaintext is hidden by default (see User's #[Hidden]
            // attribute) — makeVisible() here is the deliberate, greppable
            // opt-in for the one screen that's meant to reveal it, at the
            // platform operator's explicit request.
            'admins' => $tenant->users()
                ->where('role', 'tenant_admin')
                ->orderBy('name')
                ->get()
                ->makeVisible('password_plaintext'),
            'stations' => Station::allTenants()->orderBy('name')->get(),
        ]);
    }

    public function storeAdmin(StoreTenantAdminRequest $request, Tenant $tenant): RedirectResponse
    {
        User::provisionForTenant(
            $tenant,
            UserRole::TenantAdmin,
            $request->validated(),
            $request->user(),
        );

        return redirect()->route('platform.tenants.show', $tenant)
            ->with('success', 'Admin account created. A password was generated — reveal it from the table.');
    }

    /**
     * Edits a tenant admin's name/email. There's no password field in this
     * form — saving always rotates to a freshly generated password (same
     * generator as provisionForTenant()), kept in password_plaintext so the
     * Admin Users table's reveal-anytime password shows the new one right
     * after saving.
     */
    public function updateAdmin(UpdateTenantAdminRequest $request, Tenant $tenant, User $admin): RedirectResponse
    {
        abort_if($admin->tenant_id !== $tenant->id, 404);

        $password = Str::password(16);

        $admin->fill($request->validated());
        $admin->password = $password;
        $admin->password_plaintext = $password;
        $admin->save();

        AuditLog::record('user.updated', $request->user(), $tenant->id, 'user', $admin->id);

        return redirect()->route('platform.tenants.show', $tenant)
            ->with('success', 'Admin account updated. A new password was generated — reveal it from the table.');
    }

    /**
     * "Remove" in the Admin Users panel — there is no hard-delete for a user
     * account anywhere in this app (User::setActive() is the only mutator),
     * so this deactivates rather than destroys the row, same as the tenant
     * portal's own Deactivate action.
     */
    public function deactivateAdmin(Request $request, Tenant $tenant, User $admin): RedirectResponse
    {
        Gate::authorize('delete', $admin);
        abort_if($admin->tenant_id !== $tenant->id, 404);

        User::setActive($admin, false, $request->user());

        return redirect()->route('platform.tenants.show', $tenant)->with('success', 'Admin account removed.');
    }

    public function reactivateAdmin(Request $request, Tenant $tenant, User $admin): RedirectResponse
    {
        Gate::authorize('update', $admin);
        abort_if($admin->tenant_id !== $tenant->id, 404);

        User::setActive($admin, true, $request->user());

        return redirect()->route('platform.tenants.show', $tenant)->with('success', 'Admin account reactivated.');
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

    public function destroy(DestroyTenantRequest $request, Tenant $tenant): RedirectResponse
    {
        Tenant::purge($tenant, $request->user());

        return redirect()->route('platform.tenants.index')->with('success', 'Tenant permanently deleted.');
    }
}
