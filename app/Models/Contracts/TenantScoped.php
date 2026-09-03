<?php

namespace App\Models\Contracts;

use Illuminate\Database\Eloquent\Builder;

/**
 * Implemented by models that know how to constrain a query to a given tenant.
 * Most tenant-owned tables filter by their own tenant_id column (the default
 * behaviour provided by App\Models\Concerns\HasTenantScope); models without a
 * direct tenant_id column (e.g. station_credentials, station_activation_codes)
 * override applyTenantScope() to filter through their owning relation instead.
 */
interface TenantScoped
{
    public function applyTenantScope(Builder $builder, string $tenantId): void;
}
