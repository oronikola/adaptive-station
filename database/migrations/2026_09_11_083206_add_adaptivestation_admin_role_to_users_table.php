<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * users.role is a native MySQL ENUM (see the migration that first added
     * it) — Laravel has no schema-builder helper for widening one, so this
     * goes straight to MODIFY COLUMN. The role/tenant_id CHECK constraint
     * added alongside it also only ever allowed platform_super_admin a null
     * tenant_id, so it must widen the same way for this new platform-level
     * role (see UserRole::requiresNullTenant()).
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY role ENUM('platform_super_admin', 'tenant_admin', 'tenant_operator', 'adaptivestation_admin') NOT NULL");

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT chk_users_role_tenant');
            DB::statement(<<<'SQL'
                ALTER TABLE users
                ADD CONSTRAINT chk_users_role_tenant CHECK (
                    (role IN ('platform_super_admin', 'adaptivestation_admin') AND tenant_id IS NULL)
                    OR (role NOT IN ('platform_super_admin', 'adaptivestation_admin') AND tenant_id IS NOT NULL)
                )
            SQL);
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT chk_users_role_tenant');
            DB::statement(<<<'SQL'
                ALTER TABLE users
                ADD CONSTRAINT chk_users_role_tenant CHECK (
                    (role = 'platform_super_admin' AND tenant_id IS NULL)
                    OR (role <> 'platform_super_admin' AND tenant_id IS NOT NULL)
                )
            SQL);
        }

        DB::statement("ALTER TABLE users MODIFY role ENUM('platform_super_admin', 'tenant_admin', 'tenant_operator') NOT NULL");
    }
};
