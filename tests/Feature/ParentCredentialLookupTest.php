<?php

namespace Tests\Feature;

use App\Events\SmsGatewayWakeUp;
use App\Models\AuditLog;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ParentCredentialLookupTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_lookup_page_is_public(): void
    {
        $this->get(route('parents.credentials.index'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('Parents/CredentialLookup'));
    }

    public function test_schools_endpoint_lists_only_active_tenants_matching_the_search(): void
    {
        $active = Tenant::factory()->create(['name' => 'Kalinga National High School', 'status' => 'active']);
        Tenant::factory()->create(['name' => 'Kalinga Suspended School', 'status' => 'suspended']);
        Tenant::factory()->create(['name' => 'Unrelated Academy', 'status' => 'active']);

        $this->getJson(route('parents.credentials.schools', ['search' => 'Kalinga']))
            ->assertOk()
            ->assertJsonCount(1, 'schools')
            ->assertJsonPath('schools.0.id', $active->id);
    }

    public function test_search_only_returns_parents_within_the_chosen_school(): void
    {
        $tenant = Tenant::factory()->create();
        $other = Tenant::factory()->create();
        $match = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Maria Santos', 'phone_number' => '+639101603448']);
        ParentAccount::factory()->create(['tenant_id' => $other->id, 'name' => 'Maria Santos', 'phone_number' => '+639000000000']);
        ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Juan Cruz']);

        $this->getJson(route('parents.credentials.search', ['tenant_id' => $tenant->id, 'name' => 'Maria']))
            ->assertOk()
            ->assertJsonCount(1, 'parents')
            ->assertJsonPath('parents.0.id', $match->id)
            ->assertJsonPath('parents.0.masked_phone', '+63••••3448')
            ->assertJsonMissingPath('parents.0.phone_number');
    }

    public function test_sending_credentials_queues_an_sms_to_the_phone_on_file(): void
    {
        Event::fake([SmsGatewayWakeUp::class]);
        $tenant = Tenant::factory()->create(['name' => 'Holy Cross Of Bunawan']);
        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639101603448', 'password_plaintext' => 'TestPass1234567!']);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        $this->postJson(route('parents.credentials.send', $parent), ['tenant_id' => $tenant->id])
            ->assertOk()
            ->assertJsonPath('status', 'queued')
            ->assertJsonPath('masked_phone', '+63••••3448');

        $sms = SmsOutboxMessage::query()->where('parent_account_id', $parent->id)->sole();
        $this->assertSame('+639101603448', $sms->phone_number);
        $this->assertStringContainsString($parent->login_id, $sms->message);
        $this->assertStringContainsString($parent->password_plaintext, $sms->message);
        $this->assertStringContainsString($tenant->name, $sms->message);
        $this->assertStringContainsString("Didn't request this? Contact your school.", $sms->message);
        // Must stay within one SMS segment — a longer, concatenated message
        // was the actual cause of a real "generic failure" send on a
        // gateway phone (see the message-length incident this guards).
        $this->assertLessThanOrEqual(160, strlen($sms->message));
        Event::assertDispatched(SmsGatewayWakeUp::class);

        $log = AuditLog::allTenants()->where('action', 'parent.credentials_self_service_queued')->sole();
        $this->assertSame($parent->id, $log->entity_id);
        $this->assertSame($parent->name, $log->metadata['parent_name']);
        $this->assertSame('+63••••3448', $log->metadata['masked_phone']);
    }

    /** A school name long enough to otherwise blow past one SMS segment gets trimmed, instead of reintroducing the same multi-part-SMS failure for any school with a longer name. */
    public function test_a_long_school_name_is_trimmed_to_keep_the_message_within_one_segment(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Northern Mindanao State University Integrated Laboratory High School']);
        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639101603448', 'password_plaintext' => 'TestPass1234567!']);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        $this->postJson(route('parents.credentials.send', $parent), ['tenant_id' => $tenant->id])->assertOk();

        $sms = SmsOutboxMessage::query()->where('parent_account_id', $parent->id)->sole();
        $this->assertLessThanOrEqual(160, strlen($sms->message));
        $this->assertStringContainsString('...', $sms->message);
        $this->assertStringContainsString($parent->login_id, $sms->message);
        $this->assertStringContainsString($parent->password_plaintext, $sms->message);
    }

    public function test_a_second_send_within_five_minutes_is_treated_as_the_same_request(): void
    {
        $tenant = Tenant::factory()->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639101603448']);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        $this->postJson(route('parents.credentials.send', $parent), ['tenant_id' => $tenant->id])->assertOk();
        $this->postJson(route('parents.credentials.send', $parent), ['tenant_id' => $tenant->id])
            ->assertOk()->assertJsonPath('status', 'already_requested');

        $this->assertSame(1, SmsOutboxMessage::query()->where('parent_account_id', $parent->id)->count());
        $this->assertSame(1, AuditLog::allTenants()->where('action', 'parent.credentials_self_service_duplicate')->where('entity_id', $parent->id)->count());
    }

    public function test_sending_fails_gracefully_without_a_phone_number_or_a_linked_student(): void
    {
        $tenant = Tenant::factory()->create();
        $noPhone = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => null]);
        $this->postJson(route('parents.credentials.send', $noPhone), ['tenant_id' => $tenant->id])->assertStatus(422);

        $noLinks = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639101603448']);
        $this->postJson(route('parents.credentials.send', $noLinks), ['tenant_id' => $tenant->id])->assertStatus(422);

        $this->assertSame(0, SmsOutboxMessage::query()->count());
        $this->assertSame(1, AuditLog::allTenants()->where('action', 'parent.credentials_self_service_no_phone')->where('entity_id', $noPhone->id)->count());
        $this->assertSame(1, AuditLog::allTenants()->where('action', 'parent.credentials_self_service_no_students_linked')->where('entity_id', $noLinks->id)->count());
    }

    public function test_a_fourth_send_in_one_day_is_rate_limited(): void
    {
        $tenant = Tenant::factory()->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639101603448']);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        // Each send travels past the 5-minute "already requested" dedup
        // window so it counts as a genuinely new request against the daily
        // cap, not a replay of the previous one.
        for ($i = 0; $i < 3; $i++) {
            $this->travel(6)->minutes();
            $this->postJson(route('parents.credentials.send', $parent), ['tenant_id' => $tenant->id])
                ->assertOk()->assertJsonPath('status', 'queued');
        }

        $this->travel(6)->minutes();
        $this->postJson(route('parents.credentials.send', $parent), ['tenant_id' => $tenant->id])
            ->assertStatus(429)
            ->assertJsonPath('status', 'rate_limited');

        $this->assertSame(3, SmsOutboxMessage::query()->where('parent_account_id', $parent->id)->count());
        $this->assertSame(1, AuditLog::allTenants()->where('action', 'parent.credentials_self_service_rate_limited')->where('entity_id', $parent->id)->count());
    }

    public function test_a_parent_cannot_be_sent_credentials_under_a_different_school(): void
    {
        $tenant = Tenant::factory()->create();
        $other = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639101603448']);

        $this->postJson(route('parents.credentials.send', $parent), ['tenant_id' => $other->id])->assertStatus(404);
    }
}
