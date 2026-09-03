<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Platform super admin can provision a user for any tenant; a
     * tenant_admin can only invite users into their own tenant (via
     * User::provisionForTenant()). $tenant is passed as extra policy
     * context: Gate::authorize('create', [User::class, $tenant]).
     */
    public function create(User $user, ?Tenant $tenant = null): bool
    {
        if ($user->isPlatformSuperAdmin()) {
            return true;
        }

        return $user->isTenantAdmin() && $tenant !== null && $user->tenant_id === $tenant->id;
    }

    public function view(User $user, User $target): bool
    {
        if ($user->isPlatformSuperAdmin()) {
            return true;
        }

        if ($user->isTenantAdmin()) {
            return $user->tenant_id === $target->tenant_id;
        }

        return $user->id === $target->id;
    }

    /**
     * Expects $target to already carry the pending (unsaved) attribute
     * changes being authorized, so isDirty() reflects the change under
     * review — authorize before persisting, not after.
     */
    public function update(User $user, User $target): bool
    {
        if ($user->isPlatformSuperAdmin()) {
            return true;
        }

        if (! $user->isTenantAdmin() || $user->tenant_id !== $target->tenant_id) {
            return false;
        }

        if ($target->isDirty('tenant_id')) {
            return false;
        }

        if ($target->isDirty('role') && $target->role === UserRole::PlatformSuperAdmin) {
            return false;
        }

        return true;
    }

    public function delete(User $user, User $target): bool
    {
        if ($user->id === $target->id) {
            return false;
        }

        return $user->isPlatformSuperAdmin()
            || ($user->isTenantAdmin() && $user->tenant_id === $target->tenant_id);
    }
}
