<?php

namespace Tests\Feature\TenantIsolation;

use App\Enums\StationStatus;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TapEventCardResolutionCrossTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_card_belonging_only_to_another_tenant_is_never_linked_to_the_event(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $stationA = Station::factory()->for($tenantA)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($stationA);

        $personB = Person::factory()->for($tenantB)->create();
        RfidCard::factory()->for($tenantB)->for($personB)->create(['card_uid' => 'SHARED001']);

        $eventId = (string) Str::uuid();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [[
                    'id' => $eventId,
                    'card_uid' => 'SHARED001',
                    'event_type' => 'IN',
                    'occurred_at' => now()->toIso8601String(),
                    'occurred_offset_minutes' => 480,
                ]],
            ]);

        // Still accepted — tap_events.person_id/person_type are nullable
        // precisely to allow recording an unresolved tap, never conflated
        // with a "malformed item" rejection.
        $response->assertOk()->assertJson(['accepted_event_ids' => [$eventId]]);

        $this->assertDatabaseHas('tap_events', [
            'id' => $eventId,
            'tenant_id' => $tenantA->id,
            'person_id' => null,
        ]);
    }
}
