<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TapEventBatchIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_resubmitting_an_identical_batch_produces_no_duplicate_rows(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $eventId = (string) Str::uuid();
        $payload = [
            'events' => [[
                'id' => $eventId,
                'card_uid' => 'CARD0001',
                'event_type' => 'IN',
                'occurred_at' => now()->toIso8601String(),
                'occurred_offset_minutes' => 480,
            ]],
        ];

        $first = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', $payload);
        $second = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', $payload);

        $first->assertOk()->assertJson(['accepted_event_ids' => [$eventId], 'rejected_events' => []]);
        $second->assertOk()->assertJson(['accepted_event_ids' => [$eventId], 'rejected_events' => []]);

        $this->assertDatabaseCount('tap_events', 1, 'tenant');
    }
}
