<?php

namespace Tests\Feature\ParentApi;

use App\Enums\IntegrationProfileStatus;
use App\Enums\PersonType;
use App\Events\SmsGatewayWakeUp;
use App\Models\IntegrationProfile;
use App\Models\ParentAccessToken;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CredentialRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authorized_parent_queues_the_essentiel_credential_sms(): void
    {
        Event::fake([SmsGatewayWakeUp::class]);
        $tenant = Tenant::factory()->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Student, 'source_system' => 'essentiel_api', 'source_record_id' => '4657']);
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $parent->studentLinks()->create(['person_id' => $student->id]);
        IntegrationProfile::createForTenant($tenant->id, ['name' => 'Essentiel', 'driver' => 'essentiel_api', 'status' => IntegrationProfileStatus::Active, 'config_encrypted' => ['base_url' => 'https://app-hcb.essentiel.test', 'api_key' => 'test-key']]);
        Http::fake(['app-hcb.essentiel.test/api/v1/credentials/sms-payload' => Http::response(['status' => 'ready', 'recipient' => '+639101603448', 'message' => "Credentials\nUsername: student\nPassword: secret"])]);
        ['token' => $token] = ParentAccessToken::issueFor($parent);

        $this->withHeaders(['Authorization' => "Bearer {$token}", 'Idempotency-Key' => '9f1c2e7a-4b30-4d8e-bb19-2c5a7e4d1f08'])
            ->postJson("/api/v1/parent/children/{$student->id}/credentials")
            ->assertStatus(202)
            ->assertJsonPath('status', 'queued');

        $this->assertSame(1, SmsOutboxMessage::count());
        Event::assertDispatchedTimes(SmsGatewayWakeUp::class, 1);
    }
}
