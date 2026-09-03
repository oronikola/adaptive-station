<?php

namespace App\Models\Scopes;

use App\Models\Contracts\TenantScoped;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Scopes tenant-owned models to the current tenant context.
 *
 * Fails closed: when no tenant is set (e.g. a platform-level request that has
 * not explicitly bypassed this scope), the query returns zero rows rather than
 * every tenant's rows. Cross-tenant access must go through the model's
 * explicit allTenants() escape hatch (see App\Models\Concerns\HasTenantScope),
 * never through an "empty context happens to mean everything" fallback.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = app(TenantContext::class)->get();

        if ($tenantId === null) {
            $builder->whereRaw('1 = 0');

            return;
        }

        if ($model instanceof TenantScoped) {
            $model->applyTenantScope($builder, $tenantId);

            return;
        }

        $builder->where($model->qualifyColumn('tenant_id'), $tenantId);
    }
}
