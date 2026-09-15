<?php

namespace App\Policies;

use App\Models\StationPairingToken;
use App\Models\User;

class StationPairingTokenPolicy
{
    public function view(User $user, StationPairingToken $pairingToken): bool
    {
        return $this->belongsToTenant($user, $pairingToken->tenant_id);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->hasTenantAdminAccess();
    }

    public function update(User $user, StationPairingToken $pairingToken): bool
    {
        return $this->belongsToTenant($user, $pairingToken->tenant_id)
            && ($user->isPlatformSuperAdmin() || $user->hasTenantAdminAccess());
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->actingTenantId() === $tenantId;
    }
}
