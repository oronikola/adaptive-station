<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TenantProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_create_a_tenant(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $response = $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'Example School',
            'code' => 'example-school',
            'timezone' => 'Asia/Manila',
        ]);

        $tenant = Tenant::where('code', 'example-school')->firstOrFail();
        $response->assertRedirect(route('platform.tenants.show', $tenant));

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'tenant.created',
            'entity_id' => $tenant->id,
        ]);
    }

    public function test_tenant_code_is_normalized_to_a_clean_slug(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'City National High School',
            'code' => 'CNHS',
            'timezone' => 'Asia/Manila',
        ])->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('tenants', ['code' => 'cnhs']);
    }

    public function test_tenant_code_must_be_unique(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        Tenant::factory()->create(['code' => 'dup-code']);

        $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'Another School',
            'code' => 'dup-code',
            'timezone' => 'Asia/Manila',
        ])->assertSessionHasErrors('code');
    }

    public function test_creating_a_tenant_admin_returns_a_temporary_password_and_forces_reset(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $response = $this->actingAs($platformAdmin)->post(route('platform.tenants.admins.store', $tenant), [
            'name' => 'School Admin',
            'email' => 'school-admin@example.test',
        ]);

        $response->assertRedirect(route('platform.tenants.show', $tenant));
        $response->assertSessionHas('temporaryPassword');

        $temporaryPassword = session('temporaryPassword');
        $admin = User::where('email', 'school-admin@example.test')->firstOrFail();

        $this->assertTrue($admin->must_reset_password);
        $this->assertTrue(Hash::check($temporaryPassword, $admin->password));

        // Forced to the reset screen before reaching anything else.
        $this->actingAs($admin)->get(route('portal.people.index'))
            ->assertRedirect(route('password.force-reset'));

        $this->actingAs($admin)->get(route('password.force-reset'))
            ->assertInertia(fn ($page) => $page->component('Auth/force-reset-password-screen'));

        $this->actingAs($admin)->put(route('password.force-reset.update'), [
            'current_password' => $temporaryPassword,
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ])->assertRedirect(route('dashboard'));

        $this->assertFalse($admin->fresh()->must_reset_password);

        // No longer forced after resetting.
        $this->actingAs($admin->fresh())->get(route('portal.people.index'))->assertOk();
    }

    public function test_platform_super_admin_can_suspend_and_reactivate_a_tenant(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $this->actingAs($platformAdmin)->patch(route('platform.tenants.status', $tenant), [
            'status' => 'suspended',
        ])->assertRedirect(route('platform.tenants.show', $tenant));

        $this->assertSame('suspended', $tenant->fresh()->status->value);

        $this->actingAs($platformAdmin)->patch(route('platform.tenants.status', $tenant), [
            'status' => 'active',
        ])->assertRedirect();

        $this->assertSame('active', $tenant->fresh()->status->value);
    }
}
