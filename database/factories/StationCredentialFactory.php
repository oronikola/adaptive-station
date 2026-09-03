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
}
