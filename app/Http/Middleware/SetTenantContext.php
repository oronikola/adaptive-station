<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;

        // A real tenant_admin/tenant_operator's own tenant_id — unchanged
        // from before: fails loudly (404) if it doesn't resolve, since that
        // would mean a genuine data problem for an actual school account.
        if ($tenantId !== null) {
            app(TenantContext::class)->set($tenantId);
            TenantDatabase::use(Tenant::findOrFail($tenantId));

            return $next($request);
        }

        // adaptivestation_admin has no tenant_id of its own (a platform-
        // level role — see UserRole::requiresNullTenant()) — which school's
        // portal it's currently acting on instead lives in the session, set
        // by Oversight\SchoolSelectionController@select once it picks one.
        // platform_super_admin also has a null tenant_id and reaches here,
        // but never selects a school — nothing to resolve for it either
        // way, same as before this role existed.
        $selectedTenantId = $user?->isAdaptivestationAdmin()
            ? $request->session()->get('oversight_tenant_id')
            : null;

        $tenant = null;
        if ($selectedTenantId !== null) {
            $tenant = Tenant::find($selectedTenantId);

            // A stale/deleted selection falls back to "nothing selected"
            // rather than a hard 404 on every request — EnsurePortalAccess
            // sends it back to the picker in that case.
            if ($tenant === null) {
                $request->session()->forget('oversight_tenant_id');
                $selectedTenantId = null;
            }
        }

        app(TenantContext::class)->set($selectedTenantId);

        if ($tenant !== null) {
            TenantDatabase::use($tenant);
        }

        return $next($request);
    }
}
