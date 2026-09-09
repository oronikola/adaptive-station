<?php

namespace App\Policies;

use App\Models\SmsGatewayDevice;
use App\Models\User;

/**
 * The fleet is platform-global (not tenant-owned), so this policy is a
 * simple role check rather than the belongsToTenant() pattern used by
 * StationPolicy/StationCredentialPolicy.
 */
class SmsGatewayDevicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isPlatformSuperAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isPlatformSuperAdmin();
    }

    public function update(User $user, SmsGatewayDevice $device): bool
    {
        return $user->isPlatformSuperAdmin();
    }

    public function delete(User $user, SmsGatewayDevice $device): bool
    {
        return $user->isPlatformSuperAdmin();
    }
}
