<?php

namespace App\Policies;

use App\Models\ParentAccount;
use App\Models\User;

class ParentAccountPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active && $user->hasTenantAdminAccess();
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, ParentAccount $parent): bool
    {
        return $this->viewAny($user) && $user->actingTenantId() === $parent->tenant_id;
    }
}
