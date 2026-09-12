<?php

namespace Tests\Feature\Portal;

use App\Enums\SmsOutboxStatus;
use App\Models\Person;
use App\Models\SmsGatewayDevice;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * adaptivestation_admin has full tenant_admin-equivalent access inside
 * whichever school it selected on the oversight picker (see
 * SchoolSelectionController) — these tests prove that parity actually
 * works end-to-end (not just that the picker redirect works), and that
 * switching schools re-scopes every query, not just the ones that were
 * updated to read session state directly.
 */
class AdaptivestationAdminPortalAccessTest extends TestCase
{
    use RefreshDatabase;

    private function actingForSchool(Tenant $tenant): User
    {
        $admin = User::factory()->adaptivestationAdmin()->create();
        $this->actingAs($admin)->post(route('oversight.schools.select', $tenant));

        return $admin;
    }

    public function test_it_can_create_a_person_for_the_selected_school(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $response = $this->actingAs($admin)->post(route('portal.people.store'), [
            'person_type' => 'student',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'grade_level' => '5',
            'section' => 'A',
        ]);

        $person = Person::allTenants()->where('tenant_id', $tenant->id)->firstOrFail();
        $response->assertRedirect(route('portal.people.edit', $person));
        $this->assertSame('Jane Doe', $person->display_name);
    }

    public function test_switching_schools_scopes_the_people_list_to_the_newly_selected_school(): void
    {
        $schoolA = Tenant::factory()->create();
        $schoolB = Tenant::factory()->create();
        $personA = Person::factory()->for($schoolA)->create(['first_name' => 'Alice']);
        $personB = Person::factory()->for($schoolB)->create(['first_name' => 'Bob']);

        $admin = $this->actingForSchool($schoolA);
        $this->actingAs($admin)->get(route('portal.people.index'))
            ->assertInertia(fn ($page) => $page->where('people.data.0.id', $personA->id));

        $this->actingAs($admin)->post(route('oversight.schools.select', $schoolB));
        $this->actingAs($admin)->get(route('portal.people.index'))
            ->assertInertia(fn ($page) => $page->where('people.data.0.id', $personB->id));
    }

    public function test_it_cannot_edit_a_person_belonging_to_a_school_it_has_not_selected(): void
    {
        $schoolA = Tenant::factory()->create();
        $schoolB = Tenant::factory()->create();
        $personB = Person::factory()->for($schoolB)->create();

        $admin = $this->actingForSchool($schoolA);

        // TenantScope fails closed at route-model binding itself (same as
        // it would for a real tenant_admin given another school's id) — a
        // 404, not a 403, since the record is invisible before any policy
        // even runs.
        $this->actingAs($admin)->get(route('portal.people.edit', $personB))->assertNotFound();
    }

    public function test_it_can_invite_a_portal_user_for_the_selected_school(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $response = $this->actingAs($admin)->post(route('portal.users.store'), [
            'name' => 'New Operator',
            'email' => 'operator@example.test',
            'role' => 'tenant_operator',
        ]);

        $response->assertRedirect(route('portal.users.index'));
        $this->assertDatabaseHas('users', [
            'email' => 'operator@example.test',
            'tenant_id' => $tenant->id,
        ]);
    }

    public function test_it_can_filter_the_sms_delivery_log_by_phone(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);
        $phoneA = SmsGatewayDevice::create(['label' => 'Phone A']);
        $phoneB = SmsGatewayDevice::create(['label' => 'Phone B']);

        SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => 'Sent by Phone A',
            'status' => SmsOutboxStatus::Sent,
            'claimed_by_device_id' => $phoneA->id,
            'sim_slot' => 0,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000002',
            'message' => 'Sent by Phone B',
            'status' => SmsOutboxStatus::Sent,
            'claimed_by_device_id' => $phoneB->id,
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        $response = $this->actingAs($admin)->get(route('portal.sms-log.index', [
            'device_id' => $phoneA->id,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('messages.total', 1)
            ->where('messages.data.0.phone_number', '+639170000001')
            ->where('messages.data.0.device.label', 'Phone A')
            ->where('messages.data.0.sim_slot', 0));
    }

    public function test_it_sees_only_the_selected_schools_sms_delivery_log(): void
    {
        $schoolA = Tenant::factory()->create();
        $schoolB = Tenant::factory()->create();

        SmsOutboxMessage::create([
            'tenant_id' => $schoolA->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => 'School A alert',
            'status' => SmsOutboxStatus::Delivered,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        SmsOutboxMessage::create([
            'tenant_id' => $schoolA->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000003',
            'message' => 'School A pending alert',
            'status' => SmsOutboxStatus::Pending,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        SmsOutboxMessage::create([
            'tenant_id' => $schoolB->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000002',
            'message' => 'School B alert',
            'status' => SmsOutboxStatus::Failed,
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        $admin = $this->actingForSchool($schoolA);

        $response = $this->actingAs($admin)->get(route('portal.sms-log.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('messages.total', 2)
            ->where('stats.total', 2)
            ->where('stats.delivered', 1)
            ->where('stats.pending', 1)
            ->where('stats.failed', 0));
    }

    public function test_it_shows_which_device_sent_a_claimed_message_but_not_a_still_pending_one(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);
        ['device' => $device] = SmsGatewayDevice::provision(['label' => 'Phone 3', 'username' => 'phone3']);

        $sent = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '09171234567',
            'message' => 'Sent alert',
            'status' => SmsOutboxStatus::Sent,
            'claimed_by_device_id' => $device->id,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        $pending = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '09171234568',
            'message' => 'Pending alert',
            'status' => SmsOutboxStatus::Pending,
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        $response = $this->actingAs($admin)->get(route('portal.sms-log.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('messages.data', function ($rows) use ($sent, $pending) {
                $byId = collect($rows)->keyBy('id');

                return $byId[$sent->id]['device']['label'] === 'Phone 3'
                    && $byId[$pending->id]['device'] === null;
            }));
    }

    public function test_it_can_resend_a_failed_message_with_a_plausible_phone_number(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $message = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '09171234567',
            'message' => 'Undeliverable alert',
            'status' => SmsOutboxStatus::Failed,
            'attempts' => 3,
            'last_error' => 'Carrier rejected',
            'expires_at' => Date::now()->subDay(),
        ]);

        $response = $this->actingAs($admin)->patch(route('portal.sms-log.resend', $message->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $message->refresh();
        $this->assertSame(SmsOutboxStatus::Pending, $message->status);
        $this->assertSame(0, $message->attempts);
        $this->assertNull($message->last_error);
        $this->assertTrue($message->expires_at->isFuture());
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'action' => 'sms_outbox_message.resent',
            'entity_id' => $message->id,
        ]);
    }

    public function test_it_blocks_resending_a_message_with_an_implausible_phone_number(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $message = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '12345',
            'message' => 'Bad number alert',
            'status' => SmsOutboxStatus::Failed,
            'attempts' => 3,
            'expires_at' => Date::now()->subDay(),
        ]);

        $response = $this->actingAs($admin)->patch(route('portal.sms-log.resend', $message->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');

        $message->refresh();
        $this->assertSame(SmsOutboxStatus::Failed, $message->status);
        $this->assertSame(3, $message->attempts);
    }

    public function test_it_cannot_resend_a_message_that_is_not_dead_lettered(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $message = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '09171234567',
            'message' => 'Already delivered',
            'status' => SmsOutboxStatus::Delivered,
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        $response = $this->actingAs($admin)->patch(route('portal.sms-log.resend', $message->id));

        $response->assertSessionHas('error');
        $this->assertSame(SmsOutboxStatus::Delivered, $message->fresh()->status);
    }

    public function test_it_cannot_resend_a_message_belonging_to_a_different_school(): void
    {
        $schoolA = Tenant::factory()->create();
        $schoolB = Tenant::factory()->create();
        $admin = $this->actingForSchool($schoolA);

        $message = SmsOutboxMessage::create([
            'tenant_id' => $schoolB->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '09171234567',
            'message' => 'Other school alert',
            'status' => SmsOutboxStatus::Failed,
            'attempts' => 3,
            'expires_at' => Date::now()->subDay(),
        ]);

        $this->actingAs($admin)->patch(route('portal.sms-log.resend', $message->id))->assertNotFound();
    }

    public function test_a_tenant_admin_cannot_resend_a_message(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $message = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '09171234567',
            'message' => 'Alert',
            'status' => SmsOutboxStatus::Failed,
            'attempts' => 3,
            'expires_at' => Date::now()->subDay(),
        ]);

        $this->actingAs($tenantAdmin)->patch(route('portal.sms-log.resend', $message->id))->assertForbidden();
    }

    public function test_it_can_filter_the_sms_delivery_log_by_date_range(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $old = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => 'Old alert',
            'status' => SmsOutboxStatus::Delivered,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        $old->forceFill(['created_at' => Date::now()->subDays(10)])->save();

        SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000002',
            'message' => 'Recent alert',
            'status' => SmsOutboxStatus::Delivered,
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        $response = $this->actingAs($admin)->get(route('portal.sms-log.index', [
            'date_from' => Date::now()->subDay()->toDateString(),
            'date_to' => Date::now()->toDateString(),
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('messages.total', 1)
            ->where('messages.data.0.phone_number', '+639170000002'));
    }

    public function test_filtering_by_phone_number_returns_the_complete_history_for_printing(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        for ($i = 0; $i < 60; $i++) {
            SmsOutboxMessage::create([
                'tenant_id' => $tenant->id,
                'person_id' => (string) Str::uuid(),
                'parent_account_id' => (string) Str::uuid(),
                'phone_number' => '+639171111111',
                'message' => "Alert {$i}",
                'status' => SmsOutboxStatus::Delivered,
                'expires_at' => Date::now()->addMinutes(30),
            ]);
        }

        $response = $this->actingAs($admin)->get(route('portal.sms-log.index', [
            'phone_number' => '+639171111111',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('messages.total', 60)
            // The point of the test: all 60 rows must actually be on this
            // one page, not truncated to the default 50-per-page browsing
            // size — a print report can't silently drop rows.
            ->where('messages.data', fn ($data) => count($data) === 60));
    }

    public function test_a_tenant_admin_does_not_see_the_sms_delivery_log_menu_route(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($tenantAdmin)->get(route('portal.sms-log.index'))->assertForbidden();
    }

    public function test_it_can_preview_the_print_report_for_a_specific_number(): void
    {
        $schoolA = Tenant::factory()->create();
        $schoolB = Tenant::factory()->create();

        SmsOutboxMessage::create([
            'tenant_id' => $schoolA->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => "SCHOOL A\nAttendance Alert: Correct Student\nStatus: TAPPED IN\nTime: 8:00 AM (GMT+8)\nDate: Sep 10, 2026\nStation: Station 1",
            'status' => SmsOutboxStatus::Delivered,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        SmsOutboxMessage::create([
            'tenant_id' => $schoolA->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639179999999',
            'message' => "SCHOOL A\nAttendance Alert: Wrong Number Student\nStatus: TAPPED IN\nTime: 8:00 AM (GMT+8)\nDate: Sep 10, 2026\nStation: Station 1",
            'status' => SmsOutboxStatus::Delivered,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        SmsOutboxMessage::create([
            'tenant_id' => $schoolB->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => "SCHOOL B\nAttendance Alert: Wrong School Student\nStatus: TAPPED IN\nTime: 8:00 AM (GMT+8)\nDate: Sep 10, 2026\nStation: Station 1",
            'status' => SmsOutboxStatus::Delivered,
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        $admin = $this->actingForSchool($schoolA);

        $response = $this->actingAs($admin)->get(route('portal.sms-log.print', [
            'phone_number' => '+639170000001',
        ]));

        $response->assertOk();
        $response->assertViewIs('portal.sms-log-print');
        $response->assertSee('Correct Student');
        $response->assertDontSee('Wrong Number Student');
        $response->assertDontSee('Wrong School Student');
    }

    public function test_the_print_report_requires_a_phone_number(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $this->actingAs($admin)->get(route('portal.sms-log.print'))
            ->assertSessionHasErrors('phone_number');
    }

    public function test_a_tenant_admin_cannot_reach_the_print_report(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($tenantAdmin)->get(route('portal.sms-log.print', [
            'phone_number' => '+639170000001',
        ]))->assertForbidden();
    }

    public function test_it_gets_sent_to_the_school_picker_if_no_school_is_selected_yet(): void
    {
        $admin = User::factory()->adaptivestationAdmin()->create();

        $this->actingAs($admin)->get(route('portal.people.index'))
            ->assertRedirect(route('oversight.schools.index'));
    }
}
