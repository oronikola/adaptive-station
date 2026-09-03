<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the platform-wide super admin portal. Mirrors EnsurePortalAccess's
 * shape exactly, restricted to the opposite role.
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
