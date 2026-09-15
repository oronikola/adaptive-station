<?php

namespace Tests\Feature\Portal;

use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RfidCardManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_admin_can_assign_a_card_to_a_person(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();

        $response = $this->actingAs($admin)->post(route('portal.rfid-cards.store'), [
            'person_id' => $person->id,
            'card_uid' => 'abc123',
        ]);

        $response->assertRedirect(route('portal.people.edit', $person));

        $card = RfidCard::allTenants()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame('ABC123', $card->card_uid);
        $this->assertDatabaseHas('master_data_changes', [
            'entity_id' => $card->id, 'entity_type' => 'rfid_card', 'operation' => 'upsert',
        ], 'tenant');
    }

    public function test_duplicate_card_uid_is_rejected_even_when_the_existing_row_is_inactive(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        RfidCard::factory()->for($tenant)->for($person)->create(['card_uid' => 'DUP001', 'is_active' => false]);

        $this->actingAs($admin)->post(route('portal.rfid-cards.store'), [
            'person_id' => $person->id,
            'card_uid' => 'DUP001',
        ])->assertSessionHasErrors('card_uid');
    }

    public function test_the_same_card_uid_is_allowed_across_two_different_tenants(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $personA = Person::factory()->for($tenantA)->create();
        RfidCard::factory()->for($tenantB)->create(['card_uid' => 'SHARED01']);

        $this->actingAs($adminA)->post(route('portal.rfid-cards.store'), [
            'person_id' => $personA->id,
            'card_uid' => 'SHARED01',
        ])->assertSessionHasNoErrors();
    }

    public function test_replace_deactivates_the_old_card_and_creates_a_new_one_with_history_preserved(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        $oldCard = RfidCard::factory()->for($tenant)->for($person)->create(['card_uid' => 'OLD001']);

        $response = $this->actingAs($admin)->post(route('portal.rfid-cards.replace', $oldCard), [
            'card_uid' => 'NEW001',
        ]);

        $response->assertRedirect(route('portal.people.edit', $person));

        $this->assertFalse($oldCard->fresh()->is_active);

        $newCard = RfidCard::allTenants()->where('card_uid', 'NEW001')->firstOrFail();
        $this->assertTrue($newCard->is_active);
        $this->assertSame($person->id, $newCard->person_id);

        $this->assertDatabaseHas('master_data_changes', ['entity_id' => $oldCard->id, 'operation' => 'deactivate'], 'tenant');
        $this->assertDatabaseHas('master_data_changes', ['entity_id' => $newCard->id, 'operation' => 'upsert'], 'tenant');
    }

    public function test_replace_supports_json_response_for_modal_management(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        $oldCard = RfidCard::factory()->for($tenant)->for($person)->create(['card_uid' => 'OLDJSON']);

        $response = $this->actingAs($admin)->postJson(route('portal.rfid-cards.replace', $oldCard), [
            'card_uid' => 'NEWJSON',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Card replaced successfully.')
            ->assertJsonPath('card.card_uid', 'NEWJSON');

        $this->assertFalse($oldCard->fresh()->is_active);
    }

    public function test_person_id_from_a_different_tenant_is_rejected(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $personB = Person::factory()->for($tenantB)->create();

        $this->actingAs($adminA)->post(route('portal.rfid-cards.store'), [
            'person_id' => $personB->id,
            'card_uid' => 'X001',
        ])->assertSessionHasErrors('person_id');
    }

    public function test_tenant_operator_cannot_assign_or_deactivate_cards(): void
    {
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        $card = RfidCard::factory()->for($tenant)->for($person)->create();

        $this->actingAs($operator)->post(route('portal.rfid-cards.store'), [
            'person_id' => $person->id, 'card_uid' => 'OP001',
        ])->assertForbidden();

        $this->actingAs($operator)->patch(route('portal.rfid-cards.deactivate', $card))
            ->assertForbidden();
    }

    public function test_tenant_admin_can_view_rfid_cards_with_stats_and_filters(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create(['display_name' => 'John Doe']);
        $activeCard = RfidCard::factory()->for($tenant)->for($person)->create(['card_uid' => 'CARD-001', 'is_active' => true]);
        $inactiveCard = RfidCard::factory()->for($tenant)->create(['card_uid' => 'CARD-002', 'is_active' => false]);

        $response = $this->actingAs($admin)->get(route('portal.rfid-cards.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/rfid-cards/rfid-cards-list-screen')
                ->has('rfidCards.data', 2)
                ->where('stats.total_cards', 2)
                ->where('stats.active_cards', 1)
                ->where('stats.inactive_cards', 1)
                ->where('stats.assigned_cards', 1)
            );
    }

    public function test_tenant_admin_can_search_rfid_cards_by_uid_or_person_name(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create(['display_name' => 'Alice Wonder']);
        $cardA = RfidCard::factory()->for($tenant)->for($person)->create(['card_uid' => 'UID-ALICE']);
        $cardB = RfidCard::factory()->for($tenant)->create(['card_uid' => 'UID-BOB']);

        $response = $this->actingAs($admin)->get(route('portal.rfid-cards.index', ['search' => 'Alice']));
        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('rfidCards.data', 1)
                ->where('rfidCards.data.0.card_uid', 'UID-ALICE')
            );

        $responseUid = $this->actingAs($admin)->get(route('portal.rfid-cards.index', ['search' => 'BOB']));
        $responseUid->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('rfidCards.data', 1)
                ->where('rfidCards.data.0.card_uid', 'UID-BOB')
            );
    }
}
