<?php

namespace Tests\Feature\ParentApi;

use App\Enums\PersonType;
use App\Enums\StationStatus;
use App\Enums\TapEventType;
use App\Jobs\DispatchParentTapNotification;
use App\Models\ParentAccount;
use App\Models\ParentDeviceToken;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Services\FcmClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class ParentPushNotificationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test-only fixture key — never used against a real Google endpoint
     * (the OAuth2 token exchange is always faked below), just needed so
     * FcmClient's local openssl_sign() call has something to sign.
     */
    private const TEST_PRIVATE_KEY_PEM = <<<'PEM'
    -----BEGIN PRIVATE KEY-----
    MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCiqm2/vHIRNa9U
    yXWiIONpviwsqsRwEtJwtIDjOUOgUBwmpBb2eIbn4Jz6dmMnwkTtFooxbEZqha2e
    1Mq1Ho+FgxpYxutpoBWlsXWjkrog/l0/yPB/TLRdePUZP2EBatj4kRI7osP2v8mo
    z3//Hkr1nx5ueXNu1XD/Pz7C6Oy4XhqKuS4NcFHA9AQBSx4DKn0eLdF+uzaEuFIH
    1TnFWj6lL6fvKrJlcKahdlcxKx+MdxtGk2BOU5LBZdAMzER3hVh3uFtm6aLEVl6f
    XFratote6u8CrEZvHqk0KD8hbLdFB1OK/KfKd1YoSe6q9oMyMsuLjw1dd/meuBUt
    jGL27TAbAgMBAAECggEATnCm2cXSr6/Wq6k2W4dGgrBc9vEmJvE8n3K7kFcF4GGh
    IZURKat3SovKxxCdwgdxW276Ftkin610ytnMIkjpZrWQ1+yciuPSbINFuipALTbb
    2q1YI9rmQwjYEGO6sIdIt5ylUTKtEujrIsdk7q458XXYo+dXHcQ5aCykZDMUK9cY
    Dyl0lzxRTn/4IBnylBHm+inRS5WMjjlttlceGGuNl13NuTZXsaHhHK+B0PKIwtcX
    lwPeTAld9OjsyH/Ga3zTTZz2fuZgNtvnVAhTBjxItsYLOWqOsDJN7arGk8jk1DLE
    hx2bKgBFO0ap+8jwjh8uPqN/Nf2yECTOZC4irIyguQKBgQDX+O49+sriNcxiBYzv
    iJh5JpXkYbcWrsljk4AaYgpJXfI2Xm+HaUt0zVhESBb0ogHXPb5qYB8mY/gXTf7W
    KICfWhnfF9RLrFWTLP1jYb2hlMN5dEPSf6v2aCMsly677xgLSoOAWmjgaGhmkDnH
    irTj3KDiSFd7gSshfFMSq2MElwKBgQDA0EzSuixgo+ATdF3m0lftK/04HuWNTK27
    J+XJLZe6ejip4T/hDUoWHLmuK0PdoEAnyYXVHbutZs9X3jhCymlM8jsNFQUhVDBX
    1kTkBt3Ar/FhW6buYFg/0ZhpDo9WlDTcEAPXJAN7XeoXfuzAAPSyIeUKTdChIIha
    x4ELc5YNHQKBgD0NE1vV71Au4Q28f/Cebmug6rJapQT2d9t8MLREjp/avMN9wo1G
    yJvGCHOU5VhWC6squw8bCPMzQ0hjNeyYGnPxZmrYM50IpFAsYZycXpy0juVgZmO0
    z4miOn86ZW2e0u8uKyo3ZHo7SXfkwVCU9zmKfrg4tvIku2qF2H3okN8VAoGAIQTK
    0x9ssBQAMHSyC/AjfIsW7wBjgSILckxvzlbPb/C0OWtIfCrBcC31Ij1oftCNjAK3
    t3pDBHvhsANvEQkGpVWqBSB/Y2i+apxX6dC/Mtsuc+S1HodDNZKYDg2fQE1bDAB2
    F+aj7gF0MBfdRTgkr0icp3oR6zXeA+W8VJCztoUCgYBbckwBvUpUPQv+qYFA3APo
    +zTPXWHfDj6bxou8Ytm5zdqKC4UQgIVfPDHNAxXzeORp0XV9YoZX/hwZWxcRBIYi
    MTrx43emhR1C6ppBjyvs5yDB5sIPbDcTJieZ1W9K0t30hCHnyVJCoHkckKQ9lYbG
    y7qrjjazYLiPTIyw2ccnrw==
    -----END PRIVATE KEY-----
    PEM;

    private string $credentialsPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->credentialsPath = tempnam(sys_get_temp_dir(), 'fcm-test-credentials').'.json';
        file_put_contents($this->credentialsPath, json_encode([
            'client_email' => 'test@test-project.iam.gserviceaccount.com',
            'private_key' => self::TEST_PRIVATE_KEY_PEM,
        ]));

        config([
            'services.fcm.project_id' => 'test-project',
            'services.fcm.credentials_path' => $this->credentialsPath,
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'fake-access-token'], 200),
        ]);
    }

    protected function tearDown(): void
    {
        @unlink($this->credentialsPath);
        parent::tearDown();
    }

    private function makeLinkedFamily(Tenant $tenant, ?array $preferences = null, ?Station $station = null): array
    {
        $station ??= Station::factory()->for($tenant)->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Student, 'display_name' => 'Jamie Cruz']);
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'notification_preferences' => $preferences]);
        $parent->studentLinks()->create(['person_id' => $student->id]);
        $deviceToken = ParentDeviceToken::create(['tenant_id' => $tenant->id, 'parent_account_id' => $parent->id, 'fcm_token' => 'device-'.Str::random(10)]);

        return compact('station', 'student', 'parent', 'deviceToken');
    }

    public function test_a_new_tap_sends_a_push_to_every_linked_parents_device(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'fake-access-token'], 200),
            'https://fcm.googleapis.com/*' => Http::response(['name' => 'projects/test-project/messages/0'], 200),
        ]);
        $tenant = Tenant::factory()->create();
        ['station' => $station, 'student' => $student, 'deviceToken' => $deviceToken] = $this->makeLinkedFamily($tenant);
        $event = TapEvent::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'person_id' => $student->id, 'card_uid' => 'CARD0001', 'person_type' => PersonType::Student,
            'event_type' => TapEventType::In, 'occurred_at' => now(), 'occurred_offset_minutes' => 0,
            'received_at' => now(), 'attendance_date_local' => now()->toDateString(),
        ]);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://fcm.googleapis.com/')
            && $request['message']['token'] === $deviceToken->fcm_token
            && str_contains($request['message']['notification']['title'], 'Jamie Cruz'));
    }

    public function test_notification_preferences_suppress_a_disabled_event_type(): void
    {
        $tenant = Tenant::factory()->create();
        ['station' => $station, 'student' => $student] = $this->makeLinkedFamily($tenant, ['notify_in' => true, 'notify_out' => false]);
        $event = TapEvent::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'person_id' => $student->id, 'card_uid' => 'CARD0001', 'person_type' => PersonType::Student,
            'event_type' => TapEventType::Out, 'occurred_at' => now(), 'occurred_offset_minutes' => 0,
            'received_at' => now(), 'attendance_date_local' => now()->toDateString(),
        ]);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://fcm.googleapis.com/'));
    }

    public function test_an_unregistered_device_token_is_pruned(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'fake-access-token'], 200),
            'https://fcm.googleapis.com/*' => Http::response([
                'error' => [
                    'status' => 'NOT_FOUND',
                    'details' => [['@type' => 'type.googleapis.com/google.firebase.fcm.v1.FcmError', 'errorCode' => 'UNREGISTERED']],
                ],
            ], 404),
        ]);
        $tenant = Tenant::factory()->create();
        ['station' => $station, 'student' => $student, 'deviceToken' => $deviceToken] = $this->makeLinkedFamily($tenant);
        $event = TapEvent::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'person_id' => $student->id, 'card_uid' => 'CARD0001', 'person_type' => PersonType::Student,
            'event_type' => TapEventType::In, 'occurred_at' => now(), 'occurred_offset_minutes' => 0,
            'received_at' => now(), 'attendance_date_local' => now()->toDateString(),
        ]);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        $this->assertDatabaseMissing('parent_device_tokens', ['id' => $deviceToken->id]);
    }

    public function test_a_tap_that_resolved_no_student_dispatches_no_notification(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $event = TapEvent::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'person_id' => null, 'card_uid' => 'UNKNOWNCARD', 'person_type' => null,
            'event_type' => TapEventType::In, 'occurred_at' => now(), 'occurred_offset_minutes' => 0,
            'received_at' => now(), 'attendance_date_local' => now()->toDateString(),
        ]);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        Http::assertNothingSent();
    }

    public function test_resubmitting_a_batch_only_notifies_once(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/token' => Http::response(['access_token' => 'fake-access-token'], 200),
            'https://fcm.googleapis.com/*' => Http::response(['name' => 'ok'], 200),
        ]);
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        ['token' => $token] = StationCredential::issueFor($station);
        ['student' => $student] = $this->makeLinkedFamily($tenant, null, $station);
        RfidCard::factory()->create(['tenant_id' => $tenant->id, 'card_uid' => 'CARD0001', 'person_id' => $student->id]);

        $eventId = (string) Str::uuid();
        $payload = ['events' => [[
            'id' => $eventId, 'card_uid' => 'CARD0001', 'event_type' => 'IN',
            'occurred_at' => now()->toIso8601String(), 'occurred_offset_minutes' => 0,
        ]]];

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/device/events/batch', $payload)->assertOk();
        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/v1/device/events/batch', $payload)->assertOk();

        Http::assertSentCount(2);
    }
}
