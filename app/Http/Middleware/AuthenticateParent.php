<?php

namespace App\Http\Middleware;

use App\Enums\TenantStatus;
use App\Models\ParentAccessToken;
use App\Models\ParentAccount;
use App\Models\Tenant;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates a parent mobile-app request using its long-lived access
 * token as a bearer token — same pattern as AuthenticateStation, applied to
 * the parent-facing API instead of kiosk devices. Tenant is always derived
 * from the token, never trusted from the request payload.
 *
 * Deliberately does its own step-by-step checks (rather than delegating to
 * ParentAccessToken::authenticate(), which collapses every failure to a
 * single null) so a caller gets 401 for a bad/expired token but 403 for a
 * deactivated tenant/parent — a real distinction API consumers rely on
 * (401 means "log in again", 403 means "don't retry, contact the school").
 */
class AuthenticateParent
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        abort_unless($token !== null, 401, 'Missing access token.');

        $credential = ParentAccessToken::findActiveByPlaintextToken($token);
        abort_unless($credential !== null, 401, 'Invalid, revoked, or expired access token.');

        $tenant = Tenant::findOrFail($credential->tenant_id);
        abort_unless($tenant->status === TenantStatus::Active, 403, 'School account is not active.');

        TenantDatabase::use($tenant);
        app(TenantContext::class)->set($tenant->id);

        $parent = ParentAccount::allTenants()->whereKey($credential->parent_account_id)->first();
        abort_unless($parent?->is_active === true, 403, 'Parent account is not active.');

        $credential->forceFill(['last_used_at' => Date::now()])->save();

        $request->attributes->set('parent_account', $parent);
        $request->attributes->set('parent_access_token', $credential);

        return $next($request);
    }
}
