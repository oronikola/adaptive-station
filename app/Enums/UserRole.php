<?php

namespace App\Enums;

enum UserRole: string
{
    case PlatformSuperAdmin = 'platform_super_admin';
    case TenantAdmin = 'tenant_admin';
    case TenantOperator = 'tenant_operator';

    public function requiresNullTenant(): bool
    {
        return $this === self::PlatformSuperAdmin;
    }
}
