<?php

namespace Tests\Feature\TenantIsolation;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserPolicyCrossTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_admin_cannot_view_another_tenants_user(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $userB = User::factory()->tenantOperator($tenantB)->create();

        $this->assertFalse((new UserPolicy)->view($adminA, $userB));
    }

    public function test_tenant_admin_cannot_update_another_tenants_user(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $userB = User::factory()->tenantOperator($tenantB)->create();

        $this->assertFalse((new UserPolicy)->update($adminA, $userB));
    }

    /**
     * The policy is authorized against the target's pending (unsaved) dirty
     * attributes — the caller sets the intended change, then authorizes,
     * then saves. This mirrors the intended controller usage: authorize
     * before persisting, not after.
     */
    public function test_tenant_admin_cannot_escalate_a_same_tenant_user_to_platform_super_admin(): void
    {
        $tenant = Tenant::factory()->create();

        $admin = User::factory()->tenantAdmin($tenant)->create();
        $operator = User::factory()->tenantOperator($tenant)->create();

        $operator->role = UserRole::PlatformSuperAdmin;

        $this->assertFalse((new UserPolicy)->update($admin, $operator));
    }

    public function test_tenant_admin_cannot_move_a_same_tenant_user_to_a_different_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $admin = User::factory()->tenantAdmin($tenantA)->create();
        $operator = User::factory()->tenantOperator($tenantA)->create();

        $operator->tenant_id = $tenantB->id;

        $this->assertFalse((new UserPolicy)->update($admin, $operator));
    }

    public function test_tenant_admin_can_update_a_same_tenant_user_without_escalation(): void
    {
        $tenant = Tenant::factory()->create();

        $admin = User::factory()->tenantAdmin($tenant)->create();
        $operator = User::factory()->tenantOperator($tenant)->create();

        $operator->name = 'New Name';

        $this->assertTrue((new UserPolicy)->update($admin, $operator));
    }

    public function test_platform_super_admin_can_update_any_user(): void
    {
        $tenant = Tenant::factory()->create();

        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();

        $this->assertTrue((new UserPolicy)->update($platformAdmin, $operator));
    }
}
