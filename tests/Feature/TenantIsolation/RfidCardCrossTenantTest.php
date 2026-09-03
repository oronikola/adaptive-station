<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RfidCardCrossTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_tenant_admin_cannot_replace_another_tenants_card(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $personB = Person::factory()->for($tenantB)->create();
        $cardB = RfidCard::factory()->for($tenantB)->for($personB)->create();

        $this->actingAs($adminA)->post(route('portal.rfid-cards.replace', $cardB), [
            'card_uid' => 'HIJACK01',
        ])->assertNotFound();
    }

    public function test_a_tenant_admin_cannot_deactivate_another_tenants_card(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $personB = Person::factory()->for($tenantB)->create();
        $cardB = RfidCard::factory()->for($tenantB)->for($personB)->create();

        $this->actingAs($adminA)->patch(route('portal.rfid-cards.deactivate', $cardB))
            ->assertNotFound();

        $this->assertTrue($cardB->fresh()->is_active);
    }
}
