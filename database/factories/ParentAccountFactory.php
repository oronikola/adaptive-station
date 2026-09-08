<?php

namespace Database\Factories;

use App\Models\ParentAccount;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ParentAccount> */
class ParentAccountFactory extends Factory
{
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => 'test-parent-password',
            'is_active' => true,
        ];
    }
}
