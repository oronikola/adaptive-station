<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the platform-wide super admin portal. Mirrors EnsurePortalAccess's
 * shape exactly, restricted to the opposite role. adaptivestation_admin does
 * NOT belong here — it's a school-scoped oversight role that lives in the
 * tenant portal instead (see EnsurePortalAccess/EnsureOversightAccess),
 * never the platform area.
 */
class EnsurePlatformAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user?->isPlatformSuperAdmin() && $user->is_active, 403);

        return $next($request);
    }
}
