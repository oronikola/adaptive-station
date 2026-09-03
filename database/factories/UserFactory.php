<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * Deliberately does NOT default 'role'/'tenant_id' — the role/tenant_id
     * invariant enforced in User::booted() means every call site must state
     * intent explicitly (use platformSuperAdmin()/tenantAdmin()/tenantOperator()
     * below), catching an invalid combination at write-time instead of
     * silently relying on a "usually correct" factory default.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            // Explicit, not left to the users.is_active DB column default —
            // actingAs() reuses this in-memory instance as-is rather than
            // re-querying, so an unset attribute here stays null in tests
            // even though a real DB-fetched login would see the column
            // default. Unlike role/tenant_id this isn't a per-test-intent
            // field, so a default is appropriate; override with
            // ->state(['is_active' => false]) for inactive-user tests.
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function platformSuperAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::PlatformSuperAdmin,
            'tenant_id' => null,
        ]);
    }

    public function tenantAdmin(?Tenant $tenant = null): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::TenantAdmin,
            'tenant_id' => $tenant?->id ?? Tenant::factory(),
        ]);
    }

    public function tenantOperator(?Tenant $tenant = null): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::TenantOperator,
            'tenant_id' => $tenant?->id ?? Tenant::factory(),
        ]);
    }
}
