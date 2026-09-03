<?php

namespace App\Policies;

use App\Models\IntegrationProfile;
use App\Models\User;

/**
 * No tenant_operator access to any action, including view — this surface
 * touches legacy database credentials, a stricter bar than Station/User
 * management (StationPolicy/UserPolicy).
 */
class IntegrationProfilePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin();
    }

    public function view(User $user, IntegrationProfile $profile): bool
    {
        return $this->belongsToTenant($user, $profile->tenant_id) && $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin();
    }

    public function update(User $user, IntegrationProfile $profile): bool
    {
        return $this->belongsToTenant($user, $profile->tenant_id) && $this->create($user);
    }

    public function delete(User $user, IntegrationProfile $profile): bool
    {
        return $this->update($user, $profile);
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->tenant_id === $tenantId;
    }
}
