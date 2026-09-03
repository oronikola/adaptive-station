<?php

namespace App\Policies;

use App\Models\StationActivationCode;
use App\Models\User;

class StationActivationCodePolicy
{
    public function view(User $user, StationActivationCode $activationCode): bool
    {
        return $this->belongsToTenant($user, $activationCode->station->tenant_id);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin();
    }

    public function delete(User $user, StationActivationCode $activationCode): bool
    {
        return $this->belongsToTenant($user, $activationCode->station->tenant_id)
            && ($user->isPlatformSuperAdmin() || $user->isTenantAdmin());
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->tenant_id === $tenantId;
    }
}
