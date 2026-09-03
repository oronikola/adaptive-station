<?php

namespace Database\Factories;

use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RfidCard>
 */
class RfidCardFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'person_id' => Person::factory(),
            'card_uid' => RfidCard::normalizeCardUid(fake()->unique()->bothify('CARD####??')),
            'is_active' => true,
            'assigned_at' => now(),
        ];
    }
}
