<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the tenant school-admin portal to active tenant_admin/tenant_operator
 * users, plus adaptivestation_admin — a platform-level oversight role with
 * full admin access to whichever school it selected on the oversight
 * school-picker screen (see Oversight\SchoolSelectionController). That
 * selection is resolved into TenantContext by SetTenantContext, which runs
 * before this middleware; if nothing is selected yet, this sends it to the
 * picker instead of 403ing. platform_super_admin has no portal here (and
 * would fail closed at the query layer anyway, since TenantScope has
 * nothing to scope to for a null tenant_id).
 */
class EnsurePortalAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->isAdaptivestationAdmin() && $user->is_active) {
            if (app(TenantContext::class)->get() === null) {
                return redirect()->route('oversight.schools.index');
            }

            return $next($request);
        }

        abort_unless(
            in_array($user?->role, [UserRole::TenantAdmin, UserRole::TenantOperator], true) && $user?->is_active,
            403,
        );

        return $next($request);
    }
}
