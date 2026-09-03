<?php

namespace Tests\Feature\Integrations;

use App\Models\ImportBatch;
use App\Models\IntegrationProfile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_tenant_admin_cannot_view_another_tenants_integration_profile(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $adminB = User::factory()->tenantAdmin($tenantB)->create();

        $profileB = IntegrationProfile::createForTenant($tenantB->id, [
            'name' => 'Tenant B Legacy',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['host' => 'db-b'],
        ], $adminB);

        $this->actingAs($adminA)->get(route('portal.integrations.edit', $profileB))->assertNotFound();
    }

    public function test_a_tenant_admin_cannot_view_another_tenants_import_batch(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $adminB = User::factory()->tenantAdmin($tenantB)->create();

        $profileB = IntegrationProfile::createForTenant($tenantB->id, [
            'name' => 'Tenant B Legacy',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['host' => 'db-b'],
        ], $adminB);
        $batchB = ImportBatch::start($tenantB->id, $profileB->id, 'legacy_mysql', 'Tenant B import', $adminB);

        $this->actingAs($adminA)->get(route('portal.imports.show', $batchB))->assertNotFound();
    }

    public function test_tenant_operator_has_no_access_to_integrations_or_imports(): void
    {
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();

        $this->actingAs($operator)->get(route('portal.integrations.index'))->assertForbidden();
        $this->actingAs($operator)->get(route('portal.integrations.create'))->assertForbidden();
        $this->actingAs($operator)->get(route('portal.imports.index'))->assertForbidden();
        $this->actingAs($operator)->get(route('portal.imports.create'))->assertForbidden();
    }

    public function test_integration_profiles_index_only_shows_the_current_tenants_profiles(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $adminB = User::factory()->tenantAdmin($tenantB)->create();

        IntegrationProfile::createForTenant($tenantA->id, [
            'name' => 'Tenant A Legacy',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['host' => 'db-a'],
        ], $adminA);
        IntegrationProfile::createForTenant($tenantB->id, [
            'name' => 'Tenant B Legacy',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['host' => 'db-b'],
        ], $adminB);

        $this->actingAs($adminA)->get(route('portal.integrations.index'))
            ->assertInertia(fn ($page) => $page
                ->has('profiles', 1)
                ->where('profiles.0.name', 'Tenant A Legacy'));
    }
}
