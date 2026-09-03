<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\Person;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonCrossTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_tenant_admin_cannot_view_another_tenants_person(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $personB = Person::factory()->for($tenantB)->create();

        $this->actingAs($adminA)->get(route('portal.people.edit', $personB))->assertNotFound();
    }

    public function test_a_tenant_admin_cannot_update_another_tenants_person(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $personB = Person::factory()->for($tenantB)->create();

        $this->actingAs($adminA)->put(route('portal.people.update', $personB), [
            'person_type' => 'student', 'first_name' => 'X', 'last_name' => 'Y', 'display_name' => 'X Y',
        ])->assertNotFound();
    }
}
