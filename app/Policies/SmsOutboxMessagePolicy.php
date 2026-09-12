<?php

namespace App\Policies;

use App\Models\User;

/**
 * Gates the platform-wide, cross-tenant delivery log (every school, one
 * query) — exclusive to platform_super_admin. The single-school version
 * adaptivestation_admin sees inside a selected school's portal is a
 * separate screen (Portal\SmsDeliveryLogController), authorized inline
 * there instead of through this policy.
 */
class SmsOutboxMessagePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isPlatformSuperAdmin();
    }
}
