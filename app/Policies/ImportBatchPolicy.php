<?php

namespace App\Policies;

use App\Models\ImportBatch;
use App\Models\User;

class ImportBatchPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin();
    }

    public function view(User $user, ImportBatch $batch): bool
    {
        return $this->belongsToTenant($user, $batch->tenant_id) && $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin();
    }

    public function resolveException(User $user, ImportBatch $batch): bool
    {
        return $this->view($user, $batch);
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->tenant_id === $tenantId;
    }
}
