<?php

namespace Tests\Feature\Integrations;

use App\Models\IntegrationProfile;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class IntegrationProfileSecretRedactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_config_encrypted_is_absent_from_array_and_json_serialization(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['host' => 'db.internal', 'password' => 'super-secret'],
        ], $admin);

        $this->assertArrayNotHasKey('config_encrypted', $profile->toArray());
        $this->assertStringNotContainsString('super-secret', $profile->toJson());
        $this->assertStringNotContainsString('db.internal', $profile->toJson());

        // The raw database column must still be encrypted at rest.
        $raw = DB::connection('tenant')->table('integration_profiles')->where('id', $profile->id)->value('config_encrypted');
        $this->assertStringNotContainsString('super-secret', $raw);
    }

    public function test_edit_page_response_never_includes_config_encrypted(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['host' => 'db.internal', 'password' => 'super-secret'],
        ], $admin);

        $response = $this->actingAs($admin)->get(route('portal.integrations.edit', $profile));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->missing('profile.config_encrypted'));
        $this->assertStringNotContainsString('super-secret', $response->getContent());
    }
}
