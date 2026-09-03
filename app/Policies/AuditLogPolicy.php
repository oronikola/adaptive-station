<?php

namespace App\Policies;

use App\Models\User;

/**
 * Row-level filtering (own tenant vs. all tenants) happens at the query
 * layer via App\Models\Scopes\TenantScope / AuditLog::allTenants(), not here
 * — audit logs are listed, not authorized one record at a time.
 */
class AuditLogPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }
}
