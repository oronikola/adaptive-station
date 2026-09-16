<?php

namespace Tests\Feature\Integrations;

use App\Enums\StationStatus;
use App\Jobs\DispatchParentTapNotification;
use App\Jobs\PushTapEventToEssentielJob;
use App\Jobs\PushTapEventToLegacyJob;
use App\Models\AuditLog;
use App\Models\IntegrationProfile;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Integrations\EssentielTapResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class PushTapEventToEssentielJobTest extends TestCase
{
    use RefreshDatabase;

    protected function seedTapEvent(Tenant $tenant, ?Person $person = null): TapEvent
    {
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        return TapEvent::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'station_id' => $station->id,
            'person_id' => $person?->id,
            'card_uid' => '0006711996',
            'person_type' => $person !== null ? 'student' : null,
            'event_type' => 'IN',
            'occurred_at' => '2026-09-01 07:00:00',
            'occurred_offset_minutes' => 480,
            'received_at' => '2026-09-01 07:00:01',
            'attendance_date_local' => '2026-09-01',
        ]);
    }

    protected function makeProfile(Tenant $tenant, User $admin, string $direction = 'bidirectional', string $status = 'active'): IntegrationProfile
    {
        return IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'essentiel Test',
            'driver' => 'essentiel_api',
            'direction' => $direction,
            'status' => $status,
            'config_encrypted' => ['base_url' => 'https://app-hcb.essentiel.test', 'api_key' => 'test-key'],
        ], $admin);
    }

    protected function fakeRecordResponse(array $overrides = []): void
    {
        Http::fake([
            'app-hcb.essentiel.test/api/v1/tapping/record' => Http::response(array_merge([
                'found' => true,
                'rfid' => '0006711996',
                'person' => [
                    'type' => 'student', 'utype' => 7, 'id' => 4657,
                    'name' => ['first' => 'IVAN', 'middle' => null, 'last' => 'MASTER', 'full' => 'IVAN MASTER'],
                    'level' => ['id' => 1, 'name' => 'GRADE 1'],
                ],
                'guardians' => [['relation' => 'guardian', 'name' => 'TEST GUARDIAN', 'msisdn' => '+639101603448', 'is_sms_primary' => true]],
                'sms_recipient' => '+639101603448',
                'status' => 'recorded',
                'tap' => ['tapstate' => '1'],
            ], $overrides), 200),
        ]);
    }

    public function test_a_tenant_with_an_active_profile_sends_sms_from_the_essentiel_response(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        $event = $this->seedTapEvent($tenant, $person);
        $this->makeProfile($tenant, $admin);
        $this->fakeRecordResponse();

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        Http::assertSent(fn ($request) => $request->url() === 'https://app-hcb.essentiel.test/api/v1/tapping/record'
            && $request['rfid'] === '0006711996');

        $sms = SmsOutboxMessage::query()->where('tap_event_id', $event->id)->sole();
        $this->assertSame('+639101603448', $sms->phone_number);
        $this->assertStringContainsString('IVAN MASTER', $sms->message);
    }

    public function test_an_unknown_card_does_not_send_an_sms(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $event = $this->seedTapEvent($tenant);
        $this->makeProfile($tenant, $admin);
        $this->fakeRecordResponse(['found' => false, 'reason' => 'not_registered', 'person' => null, 'guardians' => [], 'sms_recipient' => null]);

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        $this->assertSame(0, SmsOutboxMessage::query()->where('tap_event_id', $event->id)->count());
    }

    /**
     * A card essentiel recognizes but this tenant's own roster has never
     * seen (no local Person/RfidCard yet) auto-provisions both locally —
     * see PushTapEventToEssentielJob::resolveOrCreateLocalPerson().
     */
    public function test_an_unrecognized_card_auto_provisions_a_local_person_and_rfid_card(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $event = $this->seedTapEvent($tenant); // no local person for this card_uid
        $this->makeProfile($tenant, $admin);
        $this->fakeRecordResponse();

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        $person = Person::allTenants()->where('tenant_id', $tenant->id)
            ->where('source_system', EssentielTapResolver::SOURCE_SYSTEM)
            ->where('source_record_id', '4657')
            ->sole();
        $this->assertSame('IVAN', $person->first_name);
        $this->assertSame('MASTER', $person->last_name);

        $card = RfidCard::allTenants()->where('tenant_id', $tenant->id)->where('card_uid', '0006711996')->sole();
        $this->assertSame($person->id, $card->person_id);

        // The original tap is backfilled after Essentiel resolves the card so
        // portal attendance recognizes this first tap immediately.
        $this->assertSame($person->id, $event->fresh()->person_id);
        $sms = SmsOutboxMessage::query()->where('tap_event_id', $event->id)->sole();
        $this->assertSame($person->id, $sms->person_id);
    }

    public function test_a_new_auto_provisioned_person_gets_its_photo_from_essentiel(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $event = $this->seedTapEvent($tenant);
        $this->makeProfile($tenant, $admin);
        $this->fakeRecordResponse(['person' => [
            'type' => 'student', 'utype' => 7, 'id' => 4657,
            'name' => ['first' => 'IVAN', 'middle' => null, 'last' => 'MASTER', 'full' => 'IVAN MASTER'],
            'level' => ['id' => 1, 'name' => 'GRADE 1'],
            'photo_url' => 'https://app-hcb.essentiel.test/photos/4657.jpg',
        ]]);

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        $person = Person::allTenants()->where('tenant_id', $tenant->id)
            ->where('source_system', EssentielTapResolver::SOURCE_SYSTEM)
            ->where('source_record_id', '4657')
            ->sole();
        $this->assertSame('https://app-hcb.essentiel.test/photos/4657.jpg', $person->photo_url);
    }

    /**
     * A person auto-provisioned before essentiel started returning photos
     * (or before this one changed) must not be stuck without one forever —
     * every later tap opportunistically backfills it.
     */
    public function test_an_existing_person_without_a_photo_is_backfilled_from_essentiel(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create(['photo_url' => null]);
        $event = $this->seedTapEvent($tenant, $person);
        $this->makeProfile($tenant, $admin);
        $this->fakeRecordResponse(['person' => [
            'type' => 'student', 'utype' => 7, 'id' => 4657,
            'name' => ['first' => 'IVAN', 'middle' => null, 'last' => 'MASTER', 'full' => 'IVAN MASTER'],
            'level' => ['id' => 1, 'name' => 'GRADE 1'],
            'photo_url' => 'https://app-hcb.essentiel.test/photos/4657.jpg',
        ]]);

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        $this->assertSame('https://app-hcb.essentiel.test/photos/4657.jpg', $person->fresh()->photo_url);
    }

    /** Two taps of the same still-unregistered card must not create two people. */
    public function test_a_second_tap_of_the_same_unrecognized_card_does_not_duplicate_the_person(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $firstEvent = $this->seedTapEvent($tenant);
        $secondEvent = $this->seedTapEvent($tenant);
        $this->makeProfile($tenant, $admin);
        $this->fakeRecordResponse();

        (new PushTapEventToEssentielJob($tenant->id, $firstEvent->id))->handle(app(EssentielTapResolver::class));
        (new PushTapEventToEssentielJob($tenant->id, $secondEvent->id))->handle(app(EssentielTapResolver::class));

        $this->assertSame(1, Person::allTenants()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(1, RfidCard::allTenants()->where('tenant_id', $tenant->id)->count());
    }

    public function test_a_tenant_with_no_essentiel_profile_is_a_silent_no_op(): void
    {
        $tenant = Tenant::factory()->create();
        $event = $this->seedTapEvent($tenant);
        Http::fake();

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        Http::assertNothingSent();
        $this->assertSame(0, SmsOutboxMessage::query()->where('tap_event_id', $event->id)->count());
    }

    public function test_an_import_only_profile_does_not_get_a_real_time_push(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $event = $this->seedTapEvent($tenant);
        $this->makeProfile($tenant, $admin, direction: 'import_only');
        Http::fake();

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        Http::assertNothingSent();
    }

    public function test_a_disabled_profile_does_not_get_a_real_time_push(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $event = $this->seedTapEvent($tenant);
        $this->makeProfile($tenant, $admin, status: 'disabled');
        Http::fake();

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        Http::assertNothingSent();
    }

    public function test_local_guardian_phone_number_is_synced_when_exactly_one_link_exists(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        $event = $this->seedTapEvent($tenant, $person);
        $this->makeProfile($tenant, $admin);
        $this->fakeRecordResponse();

        ['account' => $parent] = ParentAccount::provision($tenant->id, [
            'name' => 'Old Guardian Name', 'email' => 'guardian@example.test', 'phone_number' => '+639000000000',
        ]);
        $parent->studentLinks()->create(['person_id' => $person->id, 'approved_by' => $admin->id]);

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        $this->assertSame('+639101603448', $parent->fresh()->phone_number);
        $this->assertTrue(
            AuditLog::allTenants()->where('action', 'parent_account.phone_number_synced')->where('entity_id', $parent->id)->exists()
        );
    }

    public function test_local_guardian_phone_number_is_left_alone_when_multiple_links_exist(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        $event = $this->seedTapEvent($tenant, $person);
        $this->makeProfile($tenant, $admin);
        $this->fakeRecordResponse();

        ['account' => $mother] = ParentAccount::provision($tenant->id, [
            'name' => 'Mother', 'email' => 'mother@example.test', 'phone_number' => '+639000000001',
        ]);
        ['account' => $father] = ParentAccount::provision($tenant->id, [
            'name' => 'Father', 'email' => 'father@example.test', 'phone_number' => '+639000000002',
        ]);
        $mother->studentLinks()->create(['person_id' => $person->id, 'approved_by' => $admin->id]);
        $father->studentLinks()->create(['person_id' => $person->id, 'approved_by' => $admin->id]);

        (new PushTapEventToEssentielJob($tenant->id, $event->id))->handle(app(EssentielTapResolver::class));

        $this->assertSame('+639000000001', $mother->fresh()->phone_number);
        $this->assertSame('+639000000002', $father->fresh()->phone_number);
    }

    /**
     * Goes through the real device batch endpoint, same reasoning as
     * PushTapEventToLegacyJobTest's equivalent test — RfidCard's lookup
     * inside acceptBatch() needs the tenant-scoping global scope a real
     * request sets up.
     */
    public function test_accepting_a_tap_dispatches_the_essentiel_job_instead_of_the_legacy_pair(): void
    {
        Bus::fake();

        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $this->makeProfile($tenant, $admin);
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
        Bus::assertDispatched(PushTapEventToEssentielJob::class);
        Bus::assertNotDispatched(PushTapEventToLegacyJob::class);
        Bus::assertNotDispatched(DispatchParentTapNotification::class);
    }

    /**
     * Unlike the legacy_mysql path (see PushTapEventToLegacyJobTest's
     * equivalent "no matched person" test, which asserts no dispatch at
     * all), an essentiel-configured tenant must still get the job even for
     * a card its own roster has never seen — essentiel may still resolve
     * it (see resolveOrCreateLocalPerson()).
     */
    public function test_accepting_a_tap_with_an_unrecognized_card_still_dispatches_the_essentiel_job(): void
    {
        Bus::fake();

        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $this->makeProfile($tenant, $admin);
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

        Bus::assertDispatched(PushTapEventToEssentielJob::class);
    }
}
