<?php

namespace App\Http\Controllers\Platform;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ParentAccount;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform-wide "look up an account and get its login credentials" screen —
 * a school_admin/tenant_operator (User) or a parent (ParentAccount), in any
 * school. Both models keep an encrypted-but-recoverable password_plaintext
 * column specifically so this kind of admin panel can reveal a current
 * password anytime rather than only once via a flash (see the migration
 * adding that column, and User::provisionForTenant()'s docblock) — Reset
 * Password is offered alongside for the "forgot/compromised" case, using the
 * same one-time-flash + SecretOnceCallout pattern as
 * SmsGatewayDeviceController::resetPassword().
 *
 * platform_super_admin only (enforced twice: EnsurePlatformAccess on the
 * whole platform.* route group, and Gate::authorize below) — deliberately
 * not reachable by adaptivestation_admin, which is read-only oversight and
 * must never see or rotate a login credential.
 */
class AccountCredentialLookupController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Tenant::class);

        $type = $request->string('type')->toString();
        $type = in_array($type, ['user', 'parent'], true) ? $type : 'user';

        $search = $request->string('search')->trim()->toString();
        $tenantId = $request->string('tenant_id')->toString();

        $accounts = $type === 'user'
            ? $this->searchUsers($search, $tenantId)
            : $this->searchParents($search, $tenantId);

        return Inertia::render('Platform/account-credentials/account-credentials-screen', [
            'accounts' => $accounts,
            'filters' => ['type' => $type, 'search' => $search, 'tenant_id' => $tenantId],
            'tenants' => Tenant::query()->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    private function searchUsers(string $search, string $tenantId)
    {
        return User::query()
            ->with('tenant:id,name,code')
            ->whereIn('role', [UserRole::TenantAdmin, UserRole::TenantOperator])
            ->when($search !== '', fn ($query) => $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->when($tenantId !== '', fn ($query) => $query->where('tenant_id', $tenantId))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'is_active' => $user->is_active,
                'tenant' => $user->tenant ? ['id' => $user->tenant->id, 'name' => $user->tenant->name, 'code' => $user->tenant->code] : null,
                'login_id' => $user->email,
                'password' => $user->password_plaintext,
            ]);
    }

    private function searchParents(string $search, string $tenantId)
    {
        return ParentAccount::allTenants()
            ->with('tenant:id,name,code')
            ->when($search !== '', fn ($query) => $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('login_id', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone_number', 'like', "%{$search}%")))
            ->when($tenantId !== '', fn ($query) => $query->where('tenant_id', $tenantId))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (ParentAccount $parent) => [
                'id' => $parent->id,
                'name' => $parent->name,
                'email' => $parent->email,
                'is_active' => $parent->is_active,
                'tenant' => $parent->tenant ? ['id' => $parent->tenant->id, 'name' => $parent->tenant->name, 'code' => $parent->tenant->code] : null,
                'login_id' => $parent->login_id,
                'password' => $parent->password_plaintext,
            ]);
    }

    /**
     * Regenerates a school user's password. Mirrors
     * SmsGatewayDeviceController::resetPassword()'s raw DB::table() update
     * (dodges Eloquent's dirty-check decrypting a possibly stale/cross-key
     * password_plaintext) and one-time flash + SecretOnceCallout reveal.
     */
    public function resetUserPassword(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('update', $user);

        $password = Str::password(16);

        DB::connection('mysql')->table('users')
            ->where('id', $user->id)
            ->update([
                'password' => Hash::make($password),
                'password_plaintext' => Crypt::encryptString($password),
                'updated_at' => now(),
            ]);

        AuditLog::record('user.password_reset', $request->user(), $user->tenant_id, 'user', $user->id);

        return redirect()->route('platform.account-credentials.index', ['type' => 'user'])
            ->with('success', "Password reset for \"{$user->name}\".")
            ->with('credentialLoginId', $user->email)
            ->with('credentialPassword', $password);
    }

    /**
     * Regenerates a parent's password. ParentAccount is tenant-scoped, so the
     * {parent} route parameter is a plain id (implicit binding would apply
     * TenantScope and fail closed with no tenant context set on a platform
     * request) resolved explicitly via allTenants() below.
     */
    public function resetParentPassword(Request $request, string $parent): RedirectResponse
    {
        Gate::authorize('viewAny', Tenant::class);

        $account = ParentAccount::allTenants()->findOrFail($parent);
        $password = Str::password(16);

        DB::connection('mysql')->table('parent_accounts')
            ->where('id', $account->id)
            ->update([
                'password' => Hash::make($password),
                'password_plaintext' => Crypt::encryptString($password),
                'updated_at' => now(),
            ]);

        AuditLog::record('parent.password_reset', $request->user(), $account->tenant_id, 'parent_account', $account->id);

        return redirect()->route('platform.account-credentials.index', ['type' => 'parent'])
            ->with('success', "Password reset for \"{$account->name}\".")
            ->with('credentialLoginId', $account->login_id)
            ->with('credentialPassword', $password);
    }
}
