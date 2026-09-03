<?php

namespace App\Models\Concerns;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Builder;

/**
 * Provides the explicit, greppable escape hatch for cross-tenant queries.
 * Every platform-level "look across all tenants" call site should go through
 * Model::allTenants() rather than reaching for withoutGlobalScope() directly,
 * so cross-tenant access stays a deliberate, auditable action.
 */
trait HasTenantScope
{
    public static function allTenants(): Builder
    {
        return static::query()->withoutGlobalScope(TenantScope::class);
    }

    /**
     * Default tenant constraint: filter by this model's own tenant_id column.
     * Override in models without a direct tenant_id column (e.g. models scoped
     * through an owning relation) to constrain through that relation instead.
     */
    public function applyTenantScope(Builder $builder, string $tenantId): void
    {
        $builder->where($this->qualifyColumn('tenant_id'), $tenantId);
    }
}
