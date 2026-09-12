<?php

namespace Tests\Feature\Platform;

use App\Enums\ImportBatchStatus;
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
     * A school's own portal admin should never supply or see essentiel's raw
     * database credentials — connecting a school to its legacy system is a
     * platform-onboarding step, not something exposed in the portal. This
     * also proves the tenant itself is still created even when the legacy
     * connection is unreachable: onboarding must not fail wholesale just
     * because the legacy credentials given turn out to be wrong.
     */
    public function test_platform_super_admin_can_connect_a_new_tenant_to_its_legacy_system(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $response = $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'Legacy Linked School',
            'code' => 'legacy-linked-school',
            'timezone' => 'Asia/Manila',
            'connect_legacy_system' => true,
            'legacy_connection' => [
                // Loopback + a port nothing listens on: refuses the
                // connection immediately rather than hanging on a DNS/
                // network timeout, so this stays a fast test.
                'host' => '127.0.0.1',
                'port' => 1,
                'database' => 'nonexistent_db',
                'username' => 'nobody',
                'password' => 'wrong',
            ],
        ]);

        $tenant = Tenant::where('code', 'legacy-linked-school')->firstOrFail();
        $response->assertRedirect(route('platform.tenants.show', $tenant));
        $response->assertSessionHas('error');

        $profile = IntegrationProfile::allTenants()->where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($profile);
        $this->assertSame('legacy_mysql', $profile->driver);
        $this->assertSame(IntegrationDirection::Bidirectional, $profile->direction);
        $this->assertSame(IntegrationProfileStatus::Active, $profile->status);

        $batch = ImportBatch::allTenants()->where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($batch);
        $this->assertSame(ImportBatchStatus::Failed, $batch->status);
    }

    public function test_connect_legacy_system_requires_the_connection_details(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($platformAdmin)->post(route('platform.tenants.store'), [
            'name' => 'Incomplete School',
            'code' => 'incomplete-school',
            'timezone' => 'Asia/Manila',
            'connect_legacy_system' => true,
        ])->assertSessionHasErrors(['legacy_connection.host', 'legacy_connection.database', 'legacy_connection.username', 'legacy_connection.password']);

        $this->assertDatabaseMissing('tenants', ['code' => 'incomplete-school']);
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
