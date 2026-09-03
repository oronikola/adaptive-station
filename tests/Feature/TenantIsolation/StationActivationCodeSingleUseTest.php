<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StationActivationCodeSingleUseTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_activation_code_cannot_be_redeemed_twice(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        ['activationCode' => $activationCode, 'code' => $code] = StationActivationCode::issueFor($station, $admin);

        $first = StationActivationCode::redeem($code);
        $second = StationActivationCode::redeem($code);

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertNotNull($activationCode->fresh()->consumed_at);
    }

    public function test_an_expired_activation_code_cannot_be_redeemed(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        ['code' => $code] = StationActivationCode::issueFor($station, $admin, now()->subMinute());

        $this->assertNull(StationActivationCode::redeem($code));
    }

    public function test_an_incorrect_code_never_redeems_anything(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        StationActivationCode::issueFor($station, $admin);

        $this->assertNull(StationActivationCode::redeem('not-the-real-code'));
    }
}
