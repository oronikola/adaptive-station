<?php

namespace Database\Factories;

use App\Enums\TapEventType;
use App\Models\Station;
use App\Models\TapEvent;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @extends Factory<TapEvent>
 */
class TapEventFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $occurredAt = Carbon::now('UTC')->subMinutes(fake()->numberBetween(0, 1440));

        return [
            'id' => (string) Str::uuid(),
            'station_id' => Station::factory(),
            'card_uid' => 'FACTORY'.fake()->unique()->numerify('####'),
            'event_type' => fake()->randomElement(TapEventType::cases()),
            'occurred_at' => $occurredAt,
            'occurred_offset_minutes' => 0,
            'received_at' => $occurredAt,
            'source_system' => 'adaptive_station',
        ];
    }

    /**
     * tenant_id and attendance_date_local both derive from the resolved
     * station (and its tenant's timezone), computed here rather than in
     * definition() so they stay correct whether station_id came from the
     * default Station::factory() or an explicit override — and respecting
     * either being explicitly overridden by the caller.
     */
    public function configure(): static
    {
        return $this->afterMaking(function (TapEvent $event) {
            $station = Station::withoutGlobalScopes()->with('tenant')->find($event->station_id);

            $event->tenant_id ??= $station?->tenant_id;

            if ($station !== null && $event->attendance_date_local === null) {
                $event->attendance_date_local = $event->occurred_at
                    ->clone()
                    ->setTimezone($station->tenant->timezone)
                    ->toDateString();
            }
        });
    }
}
