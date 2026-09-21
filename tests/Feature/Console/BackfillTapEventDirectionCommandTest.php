<?php

namespace Tests\Feature\Console;

use App\Enums\TapEventType;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers the one-time correction for tap_events rows recorded before the
 * direction fix in TapEvent::resolveEventType() — see that method's
 * docblock for the underlying bug (a kiosk's per-device cache guessing
 * IN/OUT independently of other devices).
 */
class BackfillTapEventDirectionCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_corrects_a_run_of_consecutive_in_events_into_a_toggling_sequence(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        RfidCard::factory()->for($tenant)->for($person)->create();

        $badEventIds = [];
        foreach ([0, 10, 20] as $offsetSeconds) {
            $event = TapEvent::factory()->for($station)->create([
                'person_id' => $person->id,
                'card_uid' => 'FIXTURE0001',
                'event_type' => TapEventType::In,
                'occurred_at' => now()->addSeconds($offsetSeconds),
            ]);
            $badEventIds[] = $event->id;
        }

        $this->artisan('tap-events:backfill-direction')->assertSuccessful();

        $corrected = TapEvent::allTenants()->whereIn('id', $badEventIds)->orderBy('occurred_at')->get();

        $this->assertSame(['IN', 'OUT', 'IN'], $corrected->pluck('event_type.value')->all());
    }

    public function test_dry_run_reports_without_writing_any_changes(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        RfidCard::factory()->for($tenant)->for($person)->create();

        $event = TapEvent::factory()->for($station)->create([
            'person_id' => $person->id,
            'event_type' => TapEventType::Out,
            'occurred_at' => now(),
        ]);

        $this->artisan('tap-events:backfill-direction', ['--dry-run' => true])->assertSuccessful();

        $this->assertSame(TapEventType::Out, TapEvent::allTenants()->find($event->id)?->event_type);
    }

    public function test_a_dangling_in_from_the_previous_day_does_not_flip_the_next_days_first_tap(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        RfidCard::factory()->for($tenant)->for($person)->create();

        $yesterday = TapEvent::factory()->for($station)->create([
            'person_id' => $person->id,
            'event_type' => TapEventType::In,
            'occurred_at' => now()->subDay(),
        ]);
        $today = TapEvent::factory()->for($station)->create([
            'person_id' => $person->id,
            'event_type' => TapEventType::In,
            'occurred_at' => now(),
        ]);

        $this->artisan('tap-events:backfill-direction')->assertSuccessful();

        $this->assertSame(TapEventType::In, TapEvent::allTenants()->find($yesterday->id)?->event_type);
        $this->assertSame(TapEventType::In, TapEvent::allTenants()->find($today->id)?->event_type);
    }
}
