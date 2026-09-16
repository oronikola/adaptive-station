<?php

namespace Tests\Feature\Platform;

use App\Enums\IntegrationDirection;
use App\Enums\IntegrationProfileStatus;
use App\Models\ImportBatch;
use App\Models\IntegrationProfile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
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

    public function test_platform_super_admin_can_fetch_the_legacy_school_directory(): void
    {
        config(['services.legacy_school_directory.url' => 'https://directory.test/api/getSchoolList']);
        Cache::forget('legacy_school_directory');
        Http::fake([
            'directory.test/*' => Http::response([
                ['id' => 56, 'schoolabrv' => 'PCC', 'schoolname' => 'PILGRIM CHRISTIAN COLLEGE', 'eslink' => 'http://pcc-example.test/'],
                ['id' => 79, 'schoolabrv' => 'GTC', 'schoolname' => 'Gabriel Taborin College', 'eslink' => 'https://gtc-example.test/'],
            ], 200),
        ]);

        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $response = $this->actingAs($platformAdmin)->getJson(route('platform.tenants.legacy-schools'));

        $response->assertOk()->assertJson(['schools' => [
            ['id' => 56, 'schoolabrv' => 'PCC', 'schoolname' => 'PILGRIM CHRISTIAN COLLEGE', 'eslink' => 'http://pcc-example.test/'],
            ['id' => 79, 'schoolabrv' => 'GTC', 'schoolname' => 'Gabriel Taborin College', 'eslink' => 'https://gtc-example.test/'],
        ]]);
    }

    public function test_a_failed_legacy_directory_fetch_degrades_to_an_empty_list(): void
    {
        config(['services.legacy_school_directory.url' => 'https://directory.test/api/getSchoolList']);
        Cache::forget('legacy_school_directory');
        Http::fake(['directory.test/*' => Http::response('Service Unavailable', 503)]);

        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($platformAdmin)->getJson(route('platform.tenants.legacy-schools'))
            ->assertOk()->assertJson(['schools' => []]);
    }

    public function test_a_tenant_admin_cannot_fetch_the_legacy_school_directory(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($tenantAdmin)->getJson(route('platform.tenants.legacy-schools'))
            ->assertForbidden();
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

    public function test_creating_a_tenant_admin_generates_a_password_usable_immediately(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $response = $this->actingAs($platformAdmin)->post(route('platform.tenants.admins.store', $tenant), [
            'name' => 'School Admin',
            'email' => 'school-admin@example.test',
        ]);

        $response->assertRedirect(route('platform.tenants.show', $tenant));

        $admin = User::where('email', 'school-admin@example.test')->firstOrFail();

        // Revealable anytime from the Admin Users table, not just a one-time flash.
        $this->assertNotNull($admin->password_plaintext);
        $this->assertTrue(Hash::check($admin->password_plaintext, $admin->password));

        // No forced reset — the generated password works immediately.
        $this->actingAs($admin)->get(route('portal.people.index'))->assertOk();
    }

    public function test_a_normal_tenant_gets_no_integration_profile(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'Normal School',
            'code' => 'normal-school',
            'timezone' => 'Asia/Manila',
        ])->assertSessionDoesntHaveErrors();

        $tenant = Tenant::where('code', 'normal-school')->firstOrFail();
        $this->assertSame(0, IntegrationProfile::allTenants()->where('tenant_id', $tenant->id)->count());
    }

    /**
     * essentiel_api is the sole onboarding-time driver (see the 2026-09-14
     * update to DATA_OWNERSHIP_AND_TENANT_MODEL.md) — a school's own portal
     * admin should never supply or see essentiel's connection credentials,
     * so this is a platform-onboarding step, not something exposed in the
     * portal. Unlike legacy_mysql (still supported, just only from an
     * already-onboarded tenant's own Portal integrations screen), there is
     * no historical import to run — essentiel resolves identity/guardian
     * data live, per tap — so onboarding just creates the active profile.
     */
    public function test_platform_super_admin_can_connect_a_new_tenant_to_essentiel(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $response = $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'Essentiel Linked School',
            'code' => 'essentiel-linked-school',
            'timezone' => 'Asia/Manila',
            'connect_legacy_system' => true,
            'legacy_connection' => [
                'base_url' => 'https://app-els.essentiel.test',
                'api_key' => 'test-key',
            ],
        ]);

        $tenant = Tenant::where('code', 'essentiel-linked-school')->firstOrFail();
        $response->assertRedirect(route('platform.tenants.show', $tenant));
        $response->assertSessionDoesntHaveErrors();
        $response->assertSessionMissing('error');

        $profile = IntegrationProfile::allTenants()->where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($profile);
        $this->assertSame('essentiel_api', $profile->driver);
        $this->assertSame(IntegrationDirection::Bidirectional, $profile->direction);
        $this->assertSame(IntegrationProfileStatus::Active, $profile->status);

        $this->assertSame(0, ImportBatch::allTenants()->where('tenant_id', $tenant->id)->count());
    }

    public function test_connect_essentiel_requires_a_base_url(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'Incomplete Essentiel School',
            'code' => 'incomplete-essentiel-school',
            'timezone' => 'Asia/Manila',
            'connect_legacy_system' => true,
        ])->assertSessionHasErrors(['legacy_connection.base_url']);

        $this->assertDatabaseMissing('tenants', ['code' => 'incomplete-essentiel-school']);
    }

    /**
     * A legacy_mysql-shaped payload (host/database/username/password, no
     * base_url) is no longer a valid way to connect a school at onboarding
     * time — those fields simply aren't validated fields on this request
     * anymore, so posting them accomplishes nothing and the missing
     * base_url still fails as usual.
     */
    public function test_a_legacy_mysql_shaped_payload_is_rejected_for_missing_a_base_url(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'Old Style School',
            'code' => 'old-style-school',
            'timezone' => 'Asia/Manila',
            'connect_legacy_system' => true,
            'legacy_connection' => [
                'host' => '127.0.0.1',
                'port' => 3306,
                'database' => 'legacy_db',
                'username' => 'nobody',
                'password' => 'wrong',
            ],
        ])->assertSessionHasErrors(['legacy_connection.base_url']);

        $this->assertDatabaseMissing('tenants', ['code' => 'old-style-school']);
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

    public function test_platform_super_admin_can_update_tenant_details(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create(['name' => 'Old School Name', 'timezone' => 'Asia/Manila']);

        $response = $this->actingAs($platformAdmin)->patch(route('platform.tenants.update', $tenant), [
            'name' => 'Updated School Name',
            'timezone' => 'Asia/Tokyo',
        ]);

        $response->assertRedirect(route('platform.tenants.show', $tenant));
        $this->assertSame('Updated School Name', $tenant->fresh()->name);
        $this->assertSame('Asia/Tokyo', $tenant->fresh()->timezone);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'tenant.updated',
            'entity_id' => $tenant->id,
        ]);
    }

    public function test_tenant_controller_supports_json_requests(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create(['name' => 'Json School', 'code' => 'json-school', 'timezone' => 'Asia/Manila']);
        User::factory()->tenantAdmin($tenant)->create([
            'name' => 'Password Admin',
            'password_plaintext' => 'VisibleOnlyToSuperAdmin123!',
        ]);

        // JSON show
        $showResponse = $this->actingAs($platformAdmin)->getJson(route('platform.tenants.show', $tenant));
        $showResponse->assertOk()
            ->assertJsonStructure(['tenant', 'admins', 'stations'])
            ->assertJsonPath('tenant.id', $tenant->id)
            ->assertJsonPath('admins.0.password_plaintext', 'VisibleOnlyToSuperAdmin123!');

        // JSON update
        $updateResponse = $this->actingAs($platformAdmin)->patchJson(route('platform.tenants.update', $tenant), [
            'name' => 'Renamed Json School',
            'timezone' => 'America/New_York',
        ]);
        $updateResponse->assertOk()
            ->assertJsonPath('tenant.name', 'Renamed Json School')
            ->assertJsonPath('tenant.timezone', 'America/New_York');

        // JSON store admin
        $adminResponse = $this->actingAs($platformAdmin)->postJson(route('platform.tenants.admins.store', $tenant), [
            'name' => 'Json Admin',
            'email' => 'json-admin@example.test',
        ]);
        $adminResponse->assertOk()
            ->assertJsonStructure(['message', 'temporaryPassword', 'admin'])
            ->assertJsonPath('admin.email', 'json-admin@example.test');

        // JSON status update
        $statusResponse = $this->actingAs($platformAdmin)->patchJson(route('platform.tenants.status', $tenant), [
            'status' => 'suspended',
        ]);
        $statusResponse->assertOk()
            ->assertJsonPath('status', 'suspended');
    }

    public function test_tenant_admin_cannot_fetch_revealable_admin_passwords(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create([
            'name' => 'Tenant Admin',
            'password_plaintext' => 'MustNotBeExposed123!',
        ]);

        $this->actingAs($tenantAdmin)
            ->getJson(route('platform.tenants.show', $tenant))
            ->assertForbidden();
    }
}
