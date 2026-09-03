<?php

namespace Database\Factories;

use App\Models\Station;
use App\Models\StationCredential;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<StationCredential>
 */
class StationCredentialFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'station_id' => Station::factory(),
            'token_hash' => hash('sha256', Str::random(64)),
            'label' => 'Primary',
        ];
    }

    /**
     * tenant_id derives from the resolved station (whether the default
     * Station::factory() or an explicit override), mirroring
     * TapEventFactory's same derive-from-station pattern.
     */
    public function configure(): static
    {
        return $this->afterMaking(function (StationCredential $credential) {
            if ($credential->tenant_id !== null) {
                return;
            }

            $station = Station::withoutGlobalScopes()->find($credential->station_id);
            $credential->tenant_id ??= $station?->tenant_id;
        });
    }
}
