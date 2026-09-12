<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates the school-picker screen to active adaptivestation_admin users —
 * the only role that ever needs to choose which school's portal to act on
 * (see Oversight\SchoolSelectionController). A real tenant_admin already has
 * exactly one school (its own tenant_id) and never reaches this screen.
 */
class EnsureOversightAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user?->isAdaptivestationAdmin() && $user->is_active, 403);

        return $next($request);
    }
}
