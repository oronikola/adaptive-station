<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\StationStatus;
use App\Models\IntegrationProfile;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The kiosk's "this card isn't in my local cache" fallback — see
 * kiosk-screen.tsx's handleUnrecognizedCardFallback() and
 * TapEventResolveController's docblock. Unlike events.batch (fire-and-forget),
 * this endpoint waits for and returns essentiel's resolution.
 */
class TapEventResolveTest extends TestCase
{
    use RefreshDatabase;

    protected function makeEssentielTenant(): array
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'essentiel Test',
            'driver' => 'essentiel_api',
            'direction' => 'bidirectional',
            'status' => 'active',
            'config_encrypted' => ['base_url' => 'https://app-hcb.essentiel.test', 'api_key' => 'test-key'],
        ], $admin);
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);

        return [$tenant, $token];
    }

    protected function payload(string $cardUid): array
    {
        return [
            'id' => (string) Str::uuid(),
            'card_uid' => $cardUid,
            'event_type' => 'IN',
            'occurred_at' => now()->toIso8601String(),
            'occurred_offset_minutes' => 480,
        ];
    }

    public function test_an_unrecognized_card_resolves_through_essentiel_and_returns_the_person(): void
    {
        [$tenant, $token] = $this->makeEssentielTenant();
        Http::fake([
            'app-hcb.essentiel.test/*' => Http::response([
                'found' => true,
                'person' => [
                    'type' => 'student', 'id' => 4657,
                    'name' => ['first' => 'IVAN', 'last' => 'MASTER', 'full' => 'IVAN MASTER'],
                    'level' => ['name' => 'GRADE 1'],
                ],
                'sms_recipient' => '+639101603448',
                'status' => 'recorded',
                'tap' => ['tapstate' => '1'],
            ], 200),
        ]);

        $payload = $this->payload('0006711996');
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/taps/resolve', $payload);

        $response->assertOk()->assertJson(['found' => true]);
        $this->assertNotNull($response->json('person_id'));

        $person = Person::allTenants()->where('tenant_id', $tenant->id)->sole();
        $this->assertSame($person->id, $response->json('person_id'));
        $this->assertSame($person->id, TapEvent::allTenants()->find($payload['id'])?->person_id);

        $this->assertSame(1, SmsOutboxMessage::query()->where('phone_number', '+639101603448')->count());
    }

    public function test_a_card_essentiel_does_not_recognize_returns_not_found(): void
    {
        [, $token] = $this->makeEssentielTenant();
        Http::fake(['app-hcb.essentiel.test/*' => Http::response(['found' => false, 'reason' => 'not_registered'], 200)]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/taps/resolve', $this->payload('UNKNOWN-CARD'))
            ->assertOk()
            ->assertJson(['found' => false]);
    }

    public function test_a_non_essentiel_tenant_gets_not_found_without_any_external_call(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);
        Http::fake();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/taps/resolve', $this->payload('UNKNOWN-CARD'))
            ->assertOk()
            ->assertJson(['found' => false]);

        Http::assertNothingSent();
    }

    public function test_a_card_that_already_exists_locally_still_records_the_tap(): void
    {
        [$tenant, $token] = $this->makeEssentielTenant();
        $person = Person::factory()->for($tenant)->create();
        $card = RfidCard::factory()->for($tenant)->create(['person_id' => $person->id, 'is_active' => true]);
        Http::fake([
            'app-hcb.essentiel.test/*' => Http::response([
                'found' => true,
                'person' => ['type' => 'student', 'id' => 999, 'name' => ['full' => 'Someone Else']],
                'sms_recipient' => '+639000000000',
                'status' => 'recorded',
                'tap' => ['tapstate' => '1'],
            ], 200),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/taps/resolve', $this->payload($card->card_uid));

        // The already-local person is used — essentiel is still consulted
        // for the guardian push/SMS, but never auto-provisions a *second*
        // person for a card that already resolves locally.
        $response->assertOk()->assertJson(['found' => true, 'person_id' => $person->id]);
        $this->assertSame(1, Person::allTenants()->where('tenant_id', $tenant->id)->count());
    }

    public function test_malformed_payload_is_rejected(): void
    {
        [, $token] = $this->makeEssentielTenant();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/taps/resolve', ['card_uid' => 'X'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['id', 'event_type', 'occurred_at', 'occurred_offset_minutes']);
    }
}
