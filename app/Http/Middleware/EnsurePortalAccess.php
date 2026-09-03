<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the tenant school-admin portal to active tenant_admin/tenant_operator
 * users. platform_super_admin has no portal here (and would fail closed at
 * the query layer anyway, since TenantScope has nothing to scope to for a
 * null tenant_id).
 */
class EnsurePortalAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless(
            in_array($user?->role, [UserRole::TenantAdmin, UserRole::TenantOperator], true) && $user->is_active,
            403,
        );

        return $next($request);
    }
}
