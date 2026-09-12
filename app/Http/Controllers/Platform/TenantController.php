<?php

namespace App\Http\Controllers\Platform;

use App\Enums\IntegrationDirection;
use App\Enums\IntegrationProfileStatus;
use App\Enums\TenantStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\DestroyTenantRequest;
use App\Http\Requests\Platform\StoreTenantAdminRequest;
use App\Http\Requests\Platform\StoreTenantRequest;
use App\Http\Requests\Platform\UpdateTenantAdminRequest;
use App\Jobs\RunLegacyImportJob;
use App\Models\AuditLog;
use App\Models\ImportBatch;
use App\Models\IntegrationProfile;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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

        return Inertia::render('Platform/tenants/tenants-list-screen', [
            'tenants' => $tenants,
            'filters' => $filters,
        ]);
    }

    /**
     * Proxies the legacy system's public school directory for the "connect
     * this school" picker on the Add Client form — a browser can't call it
     * directly (cross-origin), and the actual URL is deliberately kept out
     * of app/ entirely (see config/services.php's legacy_school_directory
     * comment). Cached for an hour: this list changes rarely, and it would
     * otherwise be re-fetched on every keystroke of the picker's search box.
     * Any failure (unreachable, unexpected shape) degrades to an empty
     * list rather than breaking tenant creation — the picker is a
     * convenience, not a requirement (the connection fields still take
     * free-text input either way).
     */
    public function legacySchools(): JsonResponse
    {
        Gate::authorize('create', Tenant::class);

        $url = config('services.legacy_school_directory.url');
        if (blank($url)) {
            return response()->json(['schools' => []]);
        }

        $schools = Cache::remember('legacy_school_directory', now()->addHour(), function () use ($url) {
            try {
                $response = Http::timeout(5)->get($url);
                if (! $response->successful() || ! is_array($response->json())) {
                    return [];
                }

                return collect($response->json())
                    ->map(fn ($row) => [
                        'id' => $row['id'] ?? null,
                        'schoolabrv' => $row['schoolabrv'] ?? '',
                        'schoolname' => $row['schoolname'] ?? '',
                        'eslink' => $row['eslink'] ?? '',
                    ])
                    ->filter(fn ($row) => $row['schoolabrv'] !== '' && $row['schoolname'] !== '')
                    ->values()
                    ->all();
            } catch (\Throwable $e) {
                Log::warning('Legacy school directory fetch failed.', ['error' => $e->getMessage()]);

                return [];
            }
        });

        return response()->json(['schools' => $schools]);
    }

    public function store(StoreTenantRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $tenant = Tenant::provision($data, $request->user());

        $redirect = redirect()->route('platform.tenants.show', $tenant)->with('success', 'Tenant created.');

        if (! ($data['connect_legacy_system'] ?? false)) {
            return $redirect;
        }

        $legacyError = $this->connectLegacySystem($tenant, $data['legacy_connection'] ?? [], $request->user());

        return $legacyError !== null
            ? $redirect->with('error', $legacyError)
            : $redirect;
    }

    /**
     * Sets up this school's legacy connection at onboarding time and runs
     * its one-time historical import immediately — the tenant itself is
     * already created and committed by this point, so a failure here (e.g.
     * unreachable/misconfigured legacy credentials) must not roll back or
     * fail the whole request; it's surfaced as a flash error instead, and
     * the profile/import can be retried later from the integrations screen.
     *
     * @return string|null An error message if the import failed, else null.
     */
    protected function connectLegacySystem(Tenant $tenant, array $connectionConfig, User $actor): ?string
    {
        // integration_profiles/import_batches live on the per-tenant
        // connection — must point it at this specific tenant's database
        // before creating either, since a platform request has no tenant
        // context of its own to have already switched it.
        TenantDatabase::use($tenant);

        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy attendance system',
            'driver' => 'legacy_mysql',
            'direction' => IntegrationDirection::Bidirectional,
            'status' => IntegrationProfileStatus::Active,
            'config_encrypted' => $connectionConfig,
        ], $actor);

        $batch = ImportBatch::start($tenant->id, $profile->id, $profile->driver, 'Initial onboarding import', $actor);

        try {
            // Roster import isn't date-bound; this range only bounds the
            // attendance-history pull. Ten years comfortably covers
            // "everything that plausibly exists" without requiring whoever
            // is onboarding this school to know or guess its actual legacy
            // history length.
            RunLegacyImportJob::dispatchSync(
                $tenant->id,
                $batch->id,
                true,
                Date::now()->subYears(10)->toDateString(),
                Date::now()->toDateString(),
                $actor->id,
            );
        } catch (\Throwable $e) {
            $batch->fail($e->getMessage());

            return "Tenant created, but the legacy system import failed: {$e->getMessage()}. Fix the connection details and retry the import from the integrations screen.";
        }

        return null;
    }

    public function show(Request $request, Tenant $tenant): Response
    {
        Gate::authorize('view', $tenant);

        // Station lives on the 'tenant' connection — must point it at this
        // specific tenant's database before querying its stations, since a
        // platform request has no tenant of its own to have already
        // switched it via SetTenantContext.
        TenantDatabase::use($tenant);

        $admins = $tenant->users()
            ->where('role', 'tenant_admin')
            ->orderBy('name')
            ->get();

        // password_plaintext is hidden by default (see User's #[Hidden]
        // attribute) — makeVisible() here is the deliberate, greppable
        // opt-in for the one screen that's meant to reveal it, at the
        // platform super admin's explicit request. AdaptivestationAdmin is a
        // read-only oversight role and must not see other schools' admin
        // credentials, so it never gets this reveal — the frontend already
        // degrades to a masked "—" when password_plaintext is absent.
        if ($request->user()->isPlatformSuperAdmin()) {
            $admins->makeVisible('password_plaintext');
        }

        return Inertia::render('Platform/tenants/tenant-detail-screen', [
            'tenant' => $tenant,
            'admins' => $admins,
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
