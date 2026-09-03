<?php

namespace App\Policies;

use App\Models\Tenant;
use App\Models\User;

class TenantPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isPlatformSuperAdmin();
    }

    public function view(User $user, Tenant $tenant): bool
    {
        return $user->isPlatformSuperAdmin() || $user->tenant_id === $tenant->id;
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin();
    }

    public function update(User $user, Tenant $tenant): bool
    {
        return $user->isPlatformSuperAdmin()
            || ($user->isTenantAdmin() && $user->tenant_id === $tenant->id);
    }

    public function delete(User $user, Tenant $tenant): bool
    {
        return $user->isPlatformSuperAdmin();
    }
}
