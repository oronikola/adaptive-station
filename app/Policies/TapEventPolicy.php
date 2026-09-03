<?php

namespace App\Policies;

use App\Models\User;

/**
 * Row-level filtering happens at the query layer via TapEvent::scopeSearch()
 * (already tenant-scoped) — attendance is listed/exported, not authorized
 * one record at a time, matching AuditLogPolicy's pattern.
 */
class TapEventPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }
}
