<?php

namespace App\Policies;

use App\Models\Person;
use App\Models\User;

class PersonPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Person $person): bool
    {
        return $this->belongsToTenant($user, $person->tenant_id);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->hasTenantAdminAccess();
    }

    public function update(User $user, Person $person): bool
    {
        return $this->belongsToTenant($user, $person->tenant_id)
            && ($user->isPlatformSuperAdmin() || $user->hasTenantAdminAccess());
    }

    public function delete(User $user, Person $person): bool
    {
        return $this->update($user, $person);
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->actingTenantId() === $tenantId;
    }
}
