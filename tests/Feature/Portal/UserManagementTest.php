<?php

namespace Tests\Feature\Portal;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_admin_can_invite_a_tenant_operator(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $response = $this->actingAs($admin)->post(route('portal.users.store'), [
            'name' => 'New Operator',
            'email' => 'new-operator@example.test',
            'role' => 'tenant_operator',
        ]);

        $response->assertRedirect(route('portal.users.index'));
        $response->assertSessionHas('temporaryPassword');

        $temporaryPassword = session('temporaryPassword');
        $newUser = User::where('email', 'new-operator@example.test')->firstOrFail();

        $this->assertSame($tenant->id, $newUser->tenant_id);
        $this->assertSame('tenant_operator', $newUser->role->value);
        $this->assertTrue($newUser->must_reset_password);
        $this->assertTrue(Hash::check($temporaryPassword, $newUser->password));

        // Reuses the already-tested forced-reset flow.
        $this->actingAs($newUser)->get(route('portal.attendance.index'))
            ->assertRedirect(route('password.force-reset'));
    }

    public function test_tenant_admin_can_invite_an_additional_tenant_admin(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->post(route('portal.users.store'), [
            'name' => 'Second Admin',
            'email' => 'second-admin@example.test',
            'role' => 'tenant_admin',
        ])->assertRedirect(route('portal.users.index'));

        $newAdmin = User::where('email', 'second-admin@example.test')->firstOrFail();

        $this->assertSame($tenant->id, $newAdmin->tenant_id);
        $this->assertSame('tenant_admin', $newAdmin->role->value);
        $this->assertTrue($newAdmin->must_reset_password);
    }

    public function test_tenant_operator_cannot_invite_anyone(): void
    {
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();

        $this->actingAs($operator)->post(route('portal.users.store'), [
            'name' => 'Nobody',
            'email' => 'nobody@example.test',
            'role' => 'tenant_operator',
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'nobody@example.test']);
    }

    public function test_a_user_cannot_deactivate_themselves(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->patch(route('portal.users.deactivate', $admin))
            ->assertForbidden();

        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_tenant_admin_can_deactivate_and_reactivate_another_user(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $operator = User::factory()->tenantOperator($tenant)->create();

        $this->actingAs($admin)->patch(route('portal.users.deactivate', $operator))
            ->assertRedirect(route('portal.users.index'));
        $this->assertFalse($operator->fresh()->is_active);

        $this->actingAs($admin)->patch(route('portal.users.reactivate', $operator))
            ->assertRedirect(route('portal.users.index'));
        $this->assertTrue($operator->fresh()->is_active);
    }

    /**
     * Unlike Person/RfidCard/Station, User is deliberately not TenantScope'd
     * (see the model's own docblock), so a cross-tenant user resolves via
     * route-model binding just fine and is rejected by the policy instead —
     * 403, not the scope-hidden 404 seen elsewhere in the portal.
     */
    public function test_a_tenant_admin_cannot_manage_another_tenants_user(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $userB = User::factory()->tenantOperator($tenantB)->create();

        $this->actingAs($adminA)->patch(route('portal.users.deactivate', $userB))
            ->assertForbidden();

        $this->assertTrue($userB->fresh()->is_active);
    }
}
