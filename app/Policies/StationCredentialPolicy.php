<?php

namespace App\Policies;

use App\Models\StationCredential;
use App\Models\User;

class StationCredentialPolicy
{
    public function view(User $user, StationCredential $credential): bool
    {
        return $this->belongsToTenant($user, $credential->station->tenant_id);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin();
    }

    public function update(User $user, StationCredential $credential): bool
    {
        return $this->view($user, $credential) && ($user->isPlatformSuperAdmin() || $user->isTenantAdmin());
    }

    public function delete(User $user, StationCredential $credential): bool
    {
        return $this->update($user, $credential);
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->tenant_id === $tenantId;
    }
}
