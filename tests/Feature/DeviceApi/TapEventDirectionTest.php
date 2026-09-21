<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\TapEvent;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The kiosk decides IN/OUT client-side from its own per-device IndexedDB
 * cache (see kiosk-screen.tsx). Two devices paired to the same station don't
 * share that cache, so both can submit "IN" for what is really an IN then an
 * OUT. The server must recompute the true direction from the person's own
 * tap history instead of trusting whatever the kiosk sent — see
 * TapEvent::resolveEventType().
 */
class TapEventDirectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_second_device_toggles_direction_even_though_it_also_requested_in(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $person = Person::factory()->for($tenant)->create();
        $card = RfidCard::factory()->for($tenant)->for($person)->create();

        ['token' => $tokenDeviceA] = StationCredential::issueFor($station);
        ['token' => $tokenDeviceB] = StationCredential::issueFor($station);

        $firstTapId = (string) Str::uuid();
        $this->withHeader('Authorization', "Bearer {$tokenDeviceA}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [[
                    'id' => $firstTapId,
                    'card_uid' => $card->card_uid,
                    'event_type' => 'IN',
                    'occurred_at' => now()->toIso8601String(),
                    'occurred_offset_minutes' => 480,
                ]],
            ])->assertOk();

        // Device B has never seen this person tap before, so its own local
        // cache also computes "IN" — same bug as the reported multi-tap.
        $secondTapId = (string) Str::uuid();
        $this->withHeader('Authorization', "Bearer {$tokenDeviceB}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [[
                    'id' => $secondTapId,
                    'card_uid' => $card->card_uid,
                    'event_type' => 'IN',
                    'occurred_at' => now()->addSeconds(10)->toIso8601String(),
                    'occurred_offset_minutes' => 480,
                ]],
            ])->assertOk();

        $this->assertSame('IN', TapEvent::allTenants()->find($firstTapId)?->event_type->value);
        $this->assertSame('OUT', TapEvent::allTenants()->find($secondTapId)?->event_type->value);
    }

    /**
     * The kiosk's on-screen "Checked In/Out" and its local last_tap cache
     * are both built from the client's own optimistic guess, submitted
     * before the server responds — a mismatch here is exactly what makes
     * the portal show one direction while the kiosk told the person
     * something else. The response must report the server's real, stored
     * decision per event id so the kiosk can correct itself.
     */
    public function test_the_batch_response_reports_the_servers_resolved_direction_not_the_kiosks_guess(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $person = Person::factory()->for($tenant)->create();
        $card = RfidCard::factory()->for($tenant)->for($person)->create();
        ['token' => $tokenDeviceA] = StationCredential::issueFor($station);
        ['token' => $tokenDeviceB] = StationCredential::issueFor($station);

        $firstTapId = (string) Str::uuid();
        $this->withHeader('Authorization', "Bearer {$tokenDeviceA}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [['id' => $firstTapId, 'card_uid' => $card->card_uid, 'event_type' => 'IN', 'occurred_at' => now()->toIso8601String(), 'occurred_offset_minutes' => 480]],
            ])->assertOk()
            ->assertJsonPath("resolved_event_types.{$firstTapId}", 'IN');

        // Device B's own local cache also guesses "IN" for a person it has
        // never seen tap — the server must correct this to OUT and report
        // that correction back, not silently store OUT while telling the
        // kiosk nothing.
        $secondTapId = (string) Str::uuid();
        $this->withHeader('Authorization', "Bearer {$tokenDeviceB}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [['id' => $secondTapId, 'card_uid' => $card->card_uid, 'event_type' => 'IN', 'occurred_at' => now()->addSeconds(10)->toIso8601String(), 'occurred_offset_minutes' => 480]],
            ])->assertOk()
            ->assertJsonPath("resolved_event_types.{$secondTapId}", 'OUT');
    }

    /** A kiosk retrying an already-accepted tap (e.g. after a dropped response) must get back what was actually stored the first time, not silently nothing. */
    public function test_a_duplicate_resubmission_still_reports_the_originally_resolved_direction(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $card = RfidCard::factory()->for($tenant)->create();
        ['token' => $token] = StationCredential::issueFor($station);

        $payload = [
            'events' => [['id' => (string) Str::uuid(), 'card_uid' => $card->card_uid, 'event_type' => 'IN', 'occurred_at' => now()->toIso8601String(), 'occurred_offset_minutes' => 480]],
        ];
        $eventId = $payload['events'][0]['id'];

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/device/events/batch', $payload)
            ->assertOk()->assertJsonPath("resolved_event_types.{$eventId}", 'IN');

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/device/events/batch', $payload)
            ->assertOk()->assertJsonPath("resolved_event_types.{$eventId}", 'IN');
    }

    public function test_direction_still_toggles_normally_within_a_single_batch(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $person = Person::factory()->for($tenant)->create();
        $card = RfidCard::factory()->for($tenant)->for($person)->create();
        ['token' => $token] = StationCredential::issueFor($station);

        $inId = (string) Str::uuid();
        $outId = (string) Str::uuid();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [
                    ['id' => $inId, 'card_uid' => $card->card_uid, 'event_type' => 'IN', 'occurred_at' => now()->toIso8601String(), 'occurred_offset_minutes' => 480],
                    ['id' => $outId, 'card_uid' => $card->card_uid, 'event_type' => 'IN', 'occurred_at' => now()->addMinutes(4)->toIso8601String(), 'occurred_offset_minutes' => 480],
                ],
            ])->assertOk();

        $this->assertSame('IN', TapEvent::allTenants()->find($inId)?->event_type->value);
        $this->assertSame('OUT', TapEvent::allTenants()->find($outId)?->event_type->value);
    }

    public function test_a_dangling_in_from_the_previous_day_does_not_toggle_the_next_days_first_tap(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $person = Person::factory()->for($tenant)->create();
        $card = RfidCard::factory()->for($tenant)->for($person)->create();
        ['token' => $token] = StationCredential::issueFor($station);

        // Yesterday: tapped IN, never tapped OUT (forgotten card, outage, etc.).
        $yesterdayInId = (string) Str::uuid();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [[
                    'id' => $yesterdayInId,
                    'card_uid' => $card->card_uid,
                    'event_type' => 'IN',
                    'occurred_at' => now()->subDay()->toIso8601String(),
                    'occurred_offset_minutes' => 480,
                ]],
            ])->assertOk();

        // Today's first tap must still be IN, not toggled to OUT off
        // yesterday's dangling IN.
        $todayTapId = (string) Str::uuid();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [[
                    'id' => $todayTapId,
                    'card_uid' => $card->card_uid,
                    'event_type' => 'IN',
                    'occurred_at' => now()->toIso8601String(),
                    'occurred_offset_minutes' => 480,
                ]],
            ])->assertOk();

        $this->assertSame('IN', TapEvent::allTenants()->find($yesterdayInId)?->event_type->value);
        $this->assertSame('IN', TapEvent::allTenants()->find($todayTapId)?->event_type->value);
    }

    public function test_an_unrecognized_card_falls_back_to_the_requested_event_type(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $eventId = (string) Str::uuid();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [[
                    'id' => $eventId,
                    'card_uid' => 'UNKNOWN-CARD',
                    'event_type' => 'OUT',
                    'occurred_at' => now()->toIso8601String(),
                    'occurred_offset_minutes' => 480,
                ]],
            ])->assertOk();

        $this->assertSame('OUT', TapEvent::allTenants()->find($eventId)?->event_type->value);
    }
}
