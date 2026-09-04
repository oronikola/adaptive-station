<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TapEventBatchPartialValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_malformed_item_is_rejected_while_valid_siblings_still_succeed(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $validIdA = (string) Str::uuid();
        $validIdB = (string) Str::uuid();

        $payload = [
            'events' => [
                ['id' => $validIdA, 'card_uid' => 'CARD0001', 'event_type' => 'IN', 'occurred_at' => now()->toIso8601String(), 'occurred_offset_minutes' => 480],
                ['id' => null, 'card_uid' => '', 'event_type' => 'SIDEWAYS', 'occurred_at' => 'not-a-date', 'occurred_offset_minutes' => 99999],
                ['id' => $validIdB, 'card_uid' => 'CARD0002', 'event_type' => 'OUT', 'occurred_at' => now()->toIso8601String(), 'occurred_offset_minutes' => 480],
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', $payload);

        $response->assertOk();

        $this->assertEqualsCanonicalizing([$validIdA, $validIdB], $response->json('accepted_event_ids'));
        $this->assertCount(1, $response->json('rejected_events'));
        $this->assertDatabaseCount('tap_events', 2, 'tenant');
    }

    public function test_an_oversized_batch_envelope_is_rejected_entirely(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $events = array_fill(0, config('device.max_batch_size') + 1, [
            'id' => (string) Str::uuid(),
            'card_uid' => 'CARD0001',
            'event_type' => 'IN',
            'occurred_at' => now()->toIso8601String(),
            'occurred_offset_minutes' => 480,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', ['events' => $events]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('tap_events', 0, 'tenant');
    }
}
