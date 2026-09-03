<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('tenant_id')->nullable()->after('id');
            $table->enum('role', ['platform_super_admin', 'tenant_admin', 'tenant_operator'])->after('password');
            $table->boolean('is_active')->default(true)->after('role');
            $table->timestamp('last_login_at', 3)->nullable()->after('is_active');

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->index(['tenant_id', 'role'], 'ix_users_tenant_role');
        });

        // Defense-in-depth: enforce the role/tenant_id invariant at the database
        // level too, not just in the User model's saving() guard. MySQL-only —
        // SQLite's CHECK-constraint support can't be added via ALTER TABLE here.
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement(<<<'SQL'
                ALTER TABLE users
                ADD CONSTRAINT chk_users_role_tenant CHECK (
                    (role = 'platform_super_admin' AND tenant_id IS NULL)
                    OR (role <> 'platform_super_admin' AND tenant_id IS NOT NULL)
                )
            SQL);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT chk_users_role_tenant');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropIndex('ix_users_tenant_role');
            $table->dropColumn(['tenant_id', 'role', 'is_active', 'last_login_at']);
        });
    }
};
