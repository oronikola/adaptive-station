<?php

namespace Database\Factories;

use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<StationActivationCode>
 */
class StationActivationCodeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'station_id' => Station::factory(),
            'code_hash' => hash('sha256', Str::random(64)),
            'expires_at' => now()->addHours(24),
            'created_by_user_id' => User::factory()->platformSuperAdmin(),
        ];
    }
}
