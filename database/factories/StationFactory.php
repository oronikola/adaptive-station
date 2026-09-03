<?php

namespace Database\Factories;

use App\Enums\StationStatus;
use App\Models\Station;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Station>
 */
class StationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->words(2, true).' Station',
            'station_code' => fake()->unique()->regexify('STN-[0-9]{4}'),
            'status' => StationStatus::Active,
        ];
    }
}
