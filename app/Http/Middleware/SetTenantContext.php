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
        $tenantId = $request->user()?->tenant_id;

        app(TenantContext::class)->set($tenantId);

        // Platform super admins have no tenant_id — nothing to point the
        // 'tenant' connection at (they never touch tenant-owned models
        // directly; platform routes work with central tables only).
        if ($tenantId !== null) {
            TenantDatabase::use(Tenant::findOrFail($tenantId));
        }

        return $next($request);
    }
}
