<?php

namespace Tests\Feature\Platform;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PlatformAdminProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_create_an_adaptivestation_admin_account(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $response = $this->actingAs($platformAdmin)->post(route('platform.platform-admins.store'), [
            'name' => 'Support Viewer',
            'email' => 'viewer@example.test',
        ]);

        $response->assertRedirect(route('platform.platform-admins.index'));

        $created = User::where('email', 'viewer@example.test')->firstOrFail();
        $this->assertSame(UserRole::AdaptivestationAdmin, $created->role);
        $this->assertNull($created->tenant_id);
        $this->assertTrue($created->is_active);

        // Password works immediately, revealable from the table like other
        // admin-password reveals in this app.
        $this->assertNotNull($created->password_plaintext);
        $this->assertTrue(Hash::check($created->password_plaintext, $created->password));
    }

    public function test_email_must_be_unique(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        User::factory()->adaptivestationAdmin()->create(['email' => 'dupe@example.test']);

        $this->actingAs($platformAdmin)->post(route('platform.platform-admins.store'), [
            'name' => 'Another Viewer',
            'email' => 'dupe@example.test',
        ])->assertSessionHasErrors('email');
    }

    public function test_platform_super_admin_can_deactivate_and_reactivate_an_account(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $admin = User::factory()->adaptivestationAdmin()->create();

        $this->actingAs($platformAdmin)
            ->patch(route('platform.platform-admins.deactivate', $admin))
            ->assertRedirect(route('platform.platform-admins.index'));
        $this->assertFalse($admin->fresh()->is_active);

        $this->actingAs($platformAdmin)
            ->patch(route('platform.platform-admins.reactivate', $admin))
            ->assertRedirect(route('platform.platform-admins.index'));
        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_an_adaptivestation_admin_cannot_access_this_screen_at_all(): void
    {
        $viewer = User::factory()->adaptivestationAdmin()->create();

        $this->actingAs($viewer)->get(route('platform.platform-admins.index'))->assertForbidden();

        $this->actingAs($viewer)->post(route('platform.platform-admins.store'), [
            'name' => 'Sneaky Peer',
            'email' => 'sneaky@example.test',
        ])->assertForbidden();
    }

    public function test_a_tenant_admin_cannot_access_this_screen(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($tenantAdmin)->get(route('platform.platform-admins.index'))->assertForbidden();
    }
}
