<?php

namespace App\Policies;

use App\Models\RfidCard;
use App\Models\User;

class RfidCardPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, RfidCard $rfidCard): bool
    {
        return $this->belongsToTenant($user, $rfidCard->tenant_id);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin();
    }

    public function update(User $user, RfidCard $rfidCard): bool
    {
        return $this->belongsToTenant($user, $rfidCard->tenant_id)
            && ($user->isPlatformSuperAdmin() || $user->isTenantAdmin());
    }

    public function delete(User $user, RfidCard $rfidCard): bool
    {
        return $this->update($user, $rfidCard);
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->tenant_id === $tenantId;
    }
}
