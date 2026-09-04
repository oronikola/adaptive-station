<?php

namespace App\Http\Middleware;

use App\Enums\StationStatus;
use App\Models\StationCredential;
use App\Models\Tenant;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates a device (kiosk) request using its long-lived station
 * credential as a bearer token — there is no separate short-lived session
 * token layer (see ADR-003, ADR-004). Tenant is always derived from the
 * credential, never trusted from the request payload.
 *
 * No route behind this middleware uses an implicit {model}-bound parameter
 * today, so unlike the `web` group's SubstituteBindings reordering, no
 * equivalent care is needed here yet. If a future device route adds a bound
 * route parameter on a tenant-scoped model, re-check that this middleware
 * still runs before SubstituteBindings in the `api` group.
 */
class AuthenticateStation
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        abort_unless($token !== null, 401, 'Missing device credential.');

        $credential = StationCredential::findActiveByPlaintextToken($token);
        abort_unless($credential !== null, 401, 'Invalid, revoked, or expired device credential.');

        // tenant_id comes straight off the credential's own column (central
        // table) — the 'tenant' connection must be pointed at the right
        // physical database before Station (which lives there) can be
        // queried at all, so this has to happen before the station lookup.
        $tenant = Tenant::findOrFail($credential->tenant_id);
        TenantDatabase::use($tenant);
        app(TenantContext::class)->set($tenant->id);

        $station = $credential->station;
        abort_unless($station?->status === StationStatus::Active, 403, 'Station is not active.');

        $credential->forceFill(['last_used_at' => Date::now()])->save();

        $request->attributes->set('device_station', $station);
        $request->attributes->set('device_credential', $credential);

        return $next($request);
    }
}
