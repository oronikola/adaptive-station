<?php

namespace Tests\Feature\TenantIsolation;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class UserTenantRoleInvariantTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_with_a_tenant_id_is_rejected_by_the_model(): void
    {
        $tenant = Tenant::factory()->create();

        $this->expectException(RuntimeException::class);

        User::factory()->create([
            'role' => UserRole::PlatformSuperAdmin,
            'tenant_id' => $tenant->id,
        ]);
    }

    public function test_tenant_admin_with_no_tenant_id_is_rejected_by_the_model(): void
    {
        $this->expectException(RuntimeException::class);

        User::factory()->create([
            'role' => UserRole::TenantAdmin,
            'tenant_id' => null,
        ]);
    }

    public function test_valid_role_tenant_combinations_are_accepted(): void
    {
        $tenant = Tenant::factory()->create();

        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $this->assertNull($platformAdmin->tenant_id);
        $this->assertSame($tenant->id, $tenantAdmin->tenant_id);
    }

    /**
     * Defense-in-depth: the same invariant is enforced by a MySQL CHECK
     * constraint (see the add_tenant_and_role_to_users_table migration), so
     * even a raw insert that bypasses Eloquent entirely is rejected by the
     * database itself, not just the model's saving() guard.
     */
    public function test_the_database_itself_rejects_an_invalid_role_tenant_combination(): void
    {
        $tenant = Tenant::factory()->create();

        $this->expectException(QueryException::class);

        DB::table('users')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'name' => 'Bypass Test',
            'email' => 'bypass@example.test',
            'password' => Hash::make('password'),
            'role' => 'platform_super_admin',
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
