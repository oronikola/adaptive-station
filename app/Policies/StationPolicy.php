<?php

namespace App\Policies;

use App\Models\Station;
use App\Models\User;

/**
 * Defense-in-depth companion to App\Models\Scopes\TenantScope: a cross-tenant
 * Station is already invisible to route-model binding via the global scope,
 * but any code path that reaches a Station via Station::allTenants() (e.g. a
 * platform action) must still be checked here before mutating it.
 */
class StationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Station $station): bool
    {
        return $this->belongsToTenant($user, $station->tenant_id);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin();
    }

    public function update(User $user, Station $station): bool
    {
        return $this->belongsToTenant($user, $station->tenant_id)
            && ($user->isPlatformSuperAdmin() || $user->isTenantAdmin());
    }

    public function delete(User $user, Station $station): bool
    {
        return $this->update($user, $station);
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->tenant_id === $tenantId;
    }
}
