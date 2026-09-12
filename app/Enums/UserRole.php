<?php

namespace App\Enums;

enum UserRole: string
{
    case PlatformSuperAdmin = 'platform_super_admin';
    case TenantAdmin = 'tenant_admin';
    case TenantOperator = 'tenant_operator';

    /**
     * Read-only, platform-wide oversight role: sees every school's stations,
     * SMS delivery log, integration runs, and audit trail, but cannot
     * create/suspend/delete a tenant, issue/reset any credential, or manage
     * a legacy-system connection — those stay exclusive to PlatformSuperAdmin.
     */
    case AdaptivestationAdmin = 'adaptivestation_admin';

    public function requiresNullTenant(): bool
    {
        return $this === self::PlatformSuperAdmin || $this === self::AdaptivestationAdmin;
    }
}
