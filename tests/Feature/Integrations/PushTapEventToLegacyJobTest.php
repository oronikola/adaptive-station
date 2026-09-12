<?php

namespace Tests\Feature\Integrations;

use App\Enums\StationStatus;
use App\Jobs\PushTapEventToLegacyJob;
use App\Models\IntegrationProfile;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\LegacyFixtureConnection;
use Tests\TestCase;

class PushTapEventToLegacyJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        LegacyFixtureConnection::register();
    }

    protected function seedTapEvent(Tenant $tenant): TapEvent
    {
        $station = Station::factory()->for($tenant)->create([
            'status' => StationStatus::Active,
            'legacy_station_id' => '9',
        ]);
        $person = Person::factory()->for($tenant)->create([
            'source_system' => 'legacy_mysql',
            'source_record_id' => '101',
        ]);

        return TapEvent::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'station_id' => $station->id,
            'person_id' => $person->id,
            'card_uid' => 'CARD001',
            'person_type' => 'student',
            'event_type' => 'IN',
            'occurred_at' => '2026-09-01 07:00:00',
            'occurred_offset_minutes' => 480,
            'received_at' => '2026-09-01 07:00:01',
            'attendance_date_local' => '2026-09-01',
        ]);
    }

    protected function makeProfile(Tenant $tenant, User $admin, string $direction, string $status): IntegrationProfile
    {
        return IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy Test',
            'driver' => 'legacy_mysql',
            'direction' => $direction,
            'status' => $status,
            'config_encrypted' => ['connection' => LegacyFixtureConnection::NAME],
        ], $admin);
    }

    public function test_a_tenant_with_a_bidirectional_profile_gets_the_tap_pushed_to_its_legacy_system(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $event = $this->seedTapEvent($tenant);
        $this->makeProfile($tenant, $admin, 'bidirectional', 'active');

        (new PushTapEventToLegacyJob($tenant->id, $event->id))->handle();

        $this->assertSame(1, DB::connection(LegacyFixtureConnection::NAME)->table('taphistory')->count());
    }

    public function test_a_tenant_with_no_integration_profile_is_a_silent_no_op(): void
    {
        $tenant = Tenant::factory()->create();
        $event = $this->seedTapEvent($tenant);

        (new PushTapEventToLegacyJob($tenant->id, $event->id))->handle();

        $this->assertSame(0, DB::connection(LegacyFixtureConnection::NAME)->table('taphistory')->count());
    }

    public function test_an_import_only_profile_does_not_get_a_real_time_push(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $event = $this->seedTapEvent($tenant);
        $this->makeProfile($tenant, $admin, 'import_only', 'active');

        (new PushTapEventToLegacyJob($tenant->id, $event->id))->handle();

        $this->assertSame(0, DB::connection(LegacyFixtureConnection::NAME)->table('taphistory')->count());
    }

    public function test_a_disabled_profile_does_not_get_a_real_time_push(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $event = $this->seedTapEvent($tenant);
        $this->makeProfile($tenant, $admin, 'bidirectional', 'disabled');

        (new PushTapEventToLegacyJob($tenant->id, $event->id))->handle();

        $this->assertSame(0, DB::connection(LegacyFixtureConnection::NAME)->table('taphistory')->count());
    }

    /**
     * Goes through the real device batch endpoint (not a direct
     * TapEvent::acceptBatch() call) — RfidCard's lookup inside acceptBatch()
     * relies on the tenant-scoping global scope, which only gets set by
     * AuthenticateStation/SetTenantContext middleware on a real request, not
     * by constructing models directly in a test.
     */
    public function test_accepting_a_tap_dispatches_the_push_job(): void
    {
        Bus::fake();

        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        $person = Person::factory()->for($tenant)->create();
        $card = RfidCard::factory()->for($tenant)->create(['person_id' => $person->id, 'is_active' => true]);
        ['token' => $token] = StationCredential::issueFor($station);

        $response = $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/device/events/batch', [
            'events' => [[
                'id' => (string) Str::uuid(),
                'card_uid' => $card->card_uid,
                'event_type' => 'IN',
                'occurred_at' => now()->toIso8601String(),
                'occurred_offset_minutes' => 480,
            ]],
        ]);

        $response->assertOk()->assertJson(['rejected_events' => []]);
        Bus::assertDispatched(PushTapEventToLegacyJob::class);
    }

    public function test_accepting_a_tap_with_no_matched_person_does_not_dispatch_the_push_job(): void
    {
        Bus::fake();

        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/device/events/batch', [
            'events' => [[
                'id' => (string) Str::uuid(),
                'card_uid' => 'UNREGISTERED-CARD',
                'event_type' => 'IN',
                'occurred_at' => now()->toIso8601String(),
                'occurred_offset_minutes' => 480,
            ]],
        ])->assertOk();

        Bus::assertNotDispatched(PushTapEventToLegacyJob::class);
    }
}
