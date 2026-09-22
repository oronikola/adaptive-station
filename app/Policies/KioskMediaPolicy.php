<?php

namespace App\Policies;

use App\Models\KioskMedia;
use App\Models\Station;
use App\Models\User;

/**
 * Deliberately narrower than StationPolicy's own update() (which also
 * admits adaptivestation_admin, a read-only oversight role) — kiosk media is
 * a real content-management action, not something the platform's read-only
 * oversight role should be able to do on a school's behalf.
 */
class KioskMediaPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, KioskMedia $media): bool
    {
        return $this->belongsToTenant($user, $media->tenant_id);
    }

    public function create(User $user): bool
    {
        return $this->canManage($user);
    }

    public function update(User $user, KioskMedia $media): bool
    {
        return $this->belongsToTenant($user, $media->tenant_id) && $this->canManage($user);
    }

    public function delete(User $user, KioskMedia $media): bool
    {
        return $this->update($user, $media);
    }

    /** Gates uploading to a given station specifically — checked before the media row even exists, so it can't be a per-model check. */
    public function manageForStation(User $user, Station $station): bool
    {
        return $this->belongsToTenant($user, $station->tenant_id) && $this->canManage($user);
    }

    protected function canManage(User $user): bool
    {
        return $user->isPlatformSuperAdmin() || $user->isTenantAdmin() || $user->isTenantOperator();
    }

    protected function belongsToTenant(User $user, string $tenantId): bool
    {
        return $user->isPlatformSuperAdmin() || $user->actingTenantId() === $tenantId;
    }
}
