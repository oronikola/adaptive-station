<?php

namespace Tests\Feature\TenantIsolation;

use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StationCredentialCrossTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_station_credential_cannot_resolve_another_tenants_resources(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $stationA = Station::factory()->for($tenantA)->create();
        $stationB = Station::factory()->for($tenantB)->create();

        ['token' => $token] = StationCredential::issueFor($stationA);

        $resolved = StationCredential::findActiveByPlaintextToken($token);
        $this->assertNotNull($resolved);

        app(TenantContext::class)->set($resolved->station->tenant_id);

        $this->assertNull(Station::find($stationB->id));
        $this->assertNotNull(Station::find($stationA->id));
    }

    public function test_a_revoked_credential_is_never_resolved(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();

        ['credential' => $credential, 'token' => $token] = StationCredential::issueFor($station);
        $credential->forceFill(['revoked_at' => now()])->save();

        $this->assertNull(StationCredential::findActiveByPlaintextToken($token));
    }

    public function test_an_expired_credential_is_never_resolved(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();

        ['credential' => $credential, 'token' => $token] = StationCredential::issueFor($station);
        $credential->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->assertNull(StationCredential::findActiveByPlaintextToken($token));
    }
}
