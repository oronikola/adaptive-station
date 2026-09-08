<?php

namespace Tests\Feature\ParentApi;

use App\Enums\TapEventType;
use App\Models\ParentAccessToken;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentDataScopingTest extends TestCase
{
    use RefreshDatabase;

    private function authHeader(ParentAccount $parent): array
    {
        ['token' => $token] = ParentAccessToken::issueFor($parent);

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_children_endpoint_returns_only_linked_students(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $linked = Person::factory()->create(['tenant_id' => $tenant->id, 'display_name' => 'Linked Child']);
        $unlinked = Person::factory()->create(['tenant_id' => $tenant->id, 'display_name' => 'Unlinked Child']);
        $parent->studentLinks()->create(['person_id' => $linked->id]);

        $response = $this->withHeaders($this->authHeader($parent))->getJson('/api/v1/parent/children');

        $response->assertOk()->assertJsonCount(1, 'children')->assertJsonPath('children.0.id', $linked->id);
        $this->assertStringNotContainsString($unlinked->id, $response->getContent());
    }

    public function test_attendance_endpoint_rejects_a_student_not_linked_to_the_caller(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $otherStudent = Person::factory()->create(['tenant_id' => $tenant->id]);

        $this->withHeaders($this->authHeader($parent))
            ->getJson("/api/v1/parent/children/{$otherStudent->id}/attendance")
            ->assertStatus(403);
    }

    public function test_attendance_endpoint_returns_events_for_a_linked_student(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        $parent->studentLinks()->create(['person_id' => $student->id]);
        TapEvent::factory()->for($station)->create(['person_id' => $student->id, 'tenant_id' => $tenant->id, 'event_type' => TapEventType::In]);

        $response = $this->withHeaders($this->authHeader($parent))
            ->getJson("/api/v1/parent/children/{$student->id}/attendance");

        $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.event_type', 'IN');
    }

    public function test_a_revoked_token_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        ['credential' => $credential, 'token' => $token] = ParentAccessToken::issueFor($parent);
        ParentAccessToken::revoke($credential);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/parent/children')
            ->assertStatus(401);
    }

    public function test_a_deactivated_parent_is_rejected_on_next_request(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $headers = $this->authHeader($parent);
        $parent->forceFill(['is_active' => false])->save();

        $this->withHeaders($headers)->getJson('/api/v1/parent/children')->assertStatus(403);
    }

    public function test_notification_preferences_default_and_update(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $headers = $this->authHeader($parent);

        $this->withHeaders($headers)->getJson('/api/v1/parent/notification-preferences')
            ->assertOk()->assertJson(['preferences' => ['notify_in' => true, 'notify_out' => true]]);

        $this->withHeaders($headers)->patchJson('/api/v1/parent/notification-preferences', ['notify_in' => true, 'notify_out' => false])
            ->assertOk()->assertJson(['preferences' => ['notify_in' => true, 'notify_out' => false]]);

        $this->assertSame(['notify_in' => true, 'notify_out' => false], $parent->fresh()->notification_preferences);
    }

    public function test_device_token_registration_and_removal(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $headers = $this->authHeader($parent);

        $this->withHeaders($headers)->postJson('/api/v1/parent/device-tokens', ['fcm_token' => 'device-token-abc', 'platform' => 'android'])
            ->assertOk();
        $this->assertDatabaseHas('parent_device_tokens', ['fcm_token' => 'device-token-abc', 'parent_account_id' => $parent->id]);

        $this->withHeaders($headers)->deleteJson('/api/v1/parent/device-tokens', ['fcm_token' => 'device-token-abc'])
            ->assertOk();
        $this->assertDatabaseMissing('parent_device_tokens', ['fcm_token' => 'device-token-abc']);
    }
}
