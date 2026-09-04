<?php

namespace Tests\Feature\Portal;

use App\Models\Person;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_admin_can_create_a_person(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $response = $this->actingAs($admin)->post(route('portal.people.store'), [
            'person_type' => 'student',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'grade_level' => '5',
            'section' => 'A',
        ]);

        $person = Person::allTenants()->where('tenant_id', $tenant->id)->firstOrFail();
        $response->assertRedirect(route('portal.people.edit', $person));

        $this->assertSame('Jane Doe', $person->display_name);
        $this->assertDatabaseHas('master_data_changes', [
            'tenant_id' => $tenant->id,
            'entity_id' => $person->id,
            'entity_type' => 'person',
            'operation' => 'upsert',
        ], 'tenant');
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'actor_id' => $admin->id,
            'action' => 'person.created',
            'entity_id' => $person->id,
        ]);
    }

    public function test_tenant_admin_can_update_a_person(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create(['grade_level' => '4']);

        $response = $this->actingAs($admin)->put(route('portal.people.update', $person), [
            'person_type' => $person->person_type->value,
            'first_name' => $person->first_name,
            'last_name' => $person->last_name,
            'display_name' => $person->display_name,
            'grade_level' => '5',
        ]);

        $response->assertRedirect(route('portal.people.edit', $person));
        $this->assertSame('5', $person->fresh()->grade_level);
        $this->assertDatabaseHas('master_data_changes', [
            'entity_id' => $person->id,
            'operation' => 'upsert',
        ], 'tenant');
    }

    public function test_tenant_admin_can_deactivate_and_reactivate_a_person(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();

        $this->actingAs($admin)->patch(route('portal.people.deactivate', $person))
            ->assertRedirect(route('portal.people.edit', $person));

        $this->assertFalse($person->fresh()->is_active);
        $this->assertDatabaseHas('master_data_changes', [
            'entity_id' => $person->id,
            'operation' => 'deactivate',
        ], 'tenant');

        $this->actingAs($admin)->patch(route('portal.people.reactivate', $person))
            ->assertRedirect(route('portal.people.edit', $person));

        $this->assertTrue($person->fresh()->is_active);
    }

    public function test_tenant_operator_cannot_create_or_update_people(): void
    {
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        $person = Person::factory()->for($tenant)->create();

        $this->actingAs($operator)->post(route('portal.people.store'), [
            'person_type' => 'student', 'first_name' => 'A', 'last_name' => 'B',
        ])->assertForbidden();

        $this->actingAs($operator)->put(route('portal.people.update', $person), [
            'person_type' => 'student', 'first_name' => 'A', 'last_name' => 'B', 'display_name' => 'A B',
        ])->assertForbidden();
    }

    public function test_tenant_operator_can_view_people(): void
    {
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        Person::factory()->for($tenant)->create();

        $this->actingAs($operator)->get(route('portal.people.index'))->assertOk();
    }

    public function test_external_id_must_be_unique_per_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Person::factory()->for($tenant)->create(['external_id' => 'SIS-100']);

        $this->actingAs($admin)->post(route('portal.people.store'), [
            'person_type' => 'student', 'first_name' => 'A', 'last_name' => 'B', 'external_id' => 'SIS-100',
        ])->assertSessionHasErrors('external_id');
    }
}
