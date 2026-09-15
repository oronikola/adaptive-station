<?php

namespace Tests\Feature\Portal;

use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    public function test_creating_a_person_can_assign_a_card_and_provision_a_new_guardian(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $response = $this->actingAs($admin)->post(route('portal.people.store'), [
            'person_type' => 'student',
            'first_name' => 'Alex',
            'last_name' => 'Santos',
            'status' => 'inactive',
            'rfid_card_uid' => 'card-123',
            'guardian_name' => 'Maria Santos',
            'guardian_email' => 'Maria@Example.test',
            'guardian_phone' => '+639170000001',
        ]);

        $person = Person::allTenants()->where('tenant_id', $tenant->id)->firstOrFail();
        $response->assertRedirect(route('portal.people.edit', $person));
        $response->assertSessionHas('temporaryPassword');

        $this->assertFalse($person->fresh()->is_active);
        $this->assertSame('CARD-123', RfidCard::allTenants()->where('person_id', $person->id)->sole()->card_uid);

        $guardian = ParentAccount::query()->sole();
        $this->assertSame('maria@example.test', $guardian->email);
        $this->assertSame(1, $guardian->studentLinks()->where('person_id', $person->id)->count());
        $this->assertTrue(Hash::check($guardian->password_plaintext, $guardian->password));
    }

    public function test_creating_a_second_person_reuses_an_existing_guardian_by_email(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->post(route('portal.people.store'), [
            'person_type' => 'student', 'first_name' => 'Alex', 'last_name' => 'Santos',
            'guardian_email' => 'maria@example.test',
        ]);
        $response = $this->actingAs($admin)->post(route('portal.people.store'), [
            'person_type' => 'student', 'first_name' => 'Mia', 'last_name' => 'Santos',
            'guardian_email' => 'maria@example.test',
        ]);

        $response->assertSessionMissing('temporaryPassword');
        $this->assertSame(1, ParentAccount::query()->count());
        $this->assertSame(2, ParentAccount::query()->sole()->studentLinks()->count());
    }

    public function test_guardian_email_is_required_when_guardian_name_or_phone_is_given(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->post(route('portal.people.store'), [
            'person_type' => 'student', 'first_name' => 'A', 'last_name' => 'B',
            'guardian_phone' => '+639170000001',
        ])->assertSessionHasErrors('guardian_email');

        $this->assertDatabaseCount('people', 0, 'tenant');
    }

    public function test_update_can_deactivate_via_status_field_and_link_a_new_guardian(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();

        $response = $this->actingAs($admin)->put(route('portal.people.update', $person), [
            'person_type' => $person->person_type->value,
            'first_name' => $person->first_name,
            'last_name' => $person->last_name,
            'display_name' => $person->display_name,
            'status' => 'inactive',
            'guardian_name' => 'Maria Santos',
            'guardian_email' => 'maria@example.test',
        ]);

        $response->assertSessionHas('temporaryPassword');
        $this->assertFalse($person->fresh()->is_active);
        $this->assertDatabaseHas('master_data_changes', ['entity_id' => $person->id, 'operation' => 'deactivate'], 'tenant');

        $guardian = ParentAccount::query()->sole();
        $this->assertSame(1, $guardian->studentLinks()->where('person_id', $person->id)->count());
    }

    public function test_update_swaps_the_linked_guardian_when_the_email_changes_and_removes_it_when_cleared(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();

        $baseData = [
            'person_type' => $person->person_type->value, 'first_name' => $person->first_name,
            'last_name' => $person->last_name, 'display_name' => $person->display_name,
        ];

        $this->actingAs($admin)->put(route('portal.people.update', $person), $baseData + ['guardian_email' => 'maria@example.test']);
        $firstGuardian = ParentAccount::query()->sole();
        $this->assertSame(1, $firstGuardian->studentLinks()->count());

        $this->actingAs($admin)->put(route('portal.people.update', $person), $baseData + ['guardian_email' => 'rita@example.test']);
        $this->assertSame(2, ParentAccount::query()->count());
        $this->assertSame(0, $firstGuardian->fresh()->studentLinks()->count());
        $secondGuardian = ParentAccount::query()->where('email', 'rita@example.test')->sole();
        $this->assertSame(1, $secondGuardian->studentLinks()->count());

        $this->actingAs($admin)->put(route('portal.people.update', $person), $baseData);
        $this->assertSame(0, $secondGuardian->fresh()->studentLinks()->count());
        $this->assertDatabaseCount('parent_student_links', 0);
    }

    public function test_person_edit_url_resolves_by_external_id_or_falls_back_to_uuid(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $withCode = Person::factory()->for($tenant)->create(['external_id' => 'SIS-500']);
        $withoutCode = Person::factory()->for($tenant)->create(['external_id' => null]);

        $this->assertSame('SIS-500', $withCode->getRouteKey());
        $this->assertSame($withoutCode->id, $withoutCode->getRouteKey());

        $this->actingAs($admin)->get('/portal/people/SIS-500/edit')->assertOk();
        $this->actingAs($admin)->get("/portal/people/{$withoutCode->id}/edit")->assertOk();
    }

    public function test_a_tenant_admin_cannot_fetch_another_tenants_person_by_external_id(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        Person::factory()->for($tenantB)->create(['external_id' => 'SIS-900']);

        $this->actingAs($adminA)->get('/portal/people/SIS-900/edit')->assertNotFound();
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

    public function test_tenant_admin_can_create_a_person_via_json(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $response = $this->actingAs($admin)->postJson(route('portal.people.store'), [
            'person_type' => 'student',
            'first_name' => 'Michael',
            'last_name' => 'Scott',
            'grade_level' => '10',
            'section' => 'Emerald',
            'external_id' => 'STUDENT-999',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message', 'person'])
            ->assertJsonPath('person.display_name', 'Michael Scott');

        $this->assertDatabaseHas('people', [
            'tenant_id' => $tenant->id,
            'external_id' => 'STUDENT-999',
            'display_name' => 'Michael Scott',
        ], 'tenant');
    }
}
