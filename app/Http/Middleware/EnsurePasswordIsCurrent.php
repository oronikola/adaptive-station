<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Forces a user provisioned with a temporary password (see
 * User::provisionTenantAdmin()) through the reset-password screen before
 * they can reach anything else — per the MVP design's security requirement
 * to require a password change during first-run provisioning.
 */
class EnsurePasswordIsCurrent
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->must_reset_password
            && ! $request->routeIs('password.force-reset*')
            && ! $request->routeIs('logout')
        ) {
            return redirect()->route('password.force-reset');
        }

        return $next($request);
    }
}
