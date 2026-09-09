<?php

namespace Tests\Feature\ParentApi;

use App\Enums\PersonType;
use App\Enums\SmsOutboxStatus;
use App\Enums\TapEventType;
use App\Jobs\DispatchParentTapNotification;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Services\FcmClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class ParentSmsNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeEvent(Tenant $tenant, Station $station, Person $student, TapEventType $type): TapEvent
    {
        return TapEvent::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'person_id' => $student->id, 'card_uid' => 'CARD0001', 'person_type' => PersonType::Student,
            'event_type' => $type, 'occurred_at' => now(), 'occurred_offset_minutes' => 0,
            'received_at' => now(), 'attendance_date_local' => now()->toDateString(),
        ]);
    }

    public function test_a_tap_enqueues_exactly_one_pending_sms_for_an_opted_in_parent_with_a_phone_number(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Student, 'display_name' => 'Jamie Cruz']);
        $parent = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'phone_number' => '+639171234567',
            'notification_preferences' => ['notify_in' => true, 'notify_out' => true, 'notify_sms' => true],
        ]);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        $event = $this->makeEvent($tenant, $station, $student, TapEventType::In);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        $this->assertDatabaseCount('sms_outbox', 1, 'mysql');
        $row = SmsOutboxMessage::first();
        $this->assertSame(SmsOutboxStatus::Pending, $row->status);
        $this->assertSame('+639171234567', $row->phone_number);
        $this->assertSame($tenant->id, $row->tenant_id);
        $this->assertStringContainsString('Jamie Cruz', $row->message);
    }

    public function test_sms_message_uses_the_formal_letterhead_layout_with_gmt8_time(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Pilgrim Christian College', 'timezone' => 'Asia/Manila']);
        $station = Station::factory()->for($tenant)->create(['name' => 'Main Gate']);
        $student = Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Student, 'display_name' => 'Alex Santos']);
        $parent = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'phone_number' => '+639171234567',
            'notification_preferences' => ['notify_in' => true, 'notify_out' => true, 'notify_sms' => true],
        ]);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        // occurred_at is always stored/read as UTC — 07:45 UTC is 3:45 PM in
        // Asia/Manila (UTC+8), which is what this test is asserting on.
        $occurredAt = Carbon::parse('2026-09-10 07:45:00', 'UTC');
        $event = TapEvent::create([
            'id' => (string) Str::uuid(), 'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'person_id' => $student->id, 'card_uid' => 'CARD0001', 'person_type' => PersonType::Student,
            'event_type' => TapEventType::Out, 'occurred_at' => $occurredAt, 'occurred_offset_minutes' => 0,
            'received_at' => $occurredAt, 'attendance_date_local' => $occurredAt->toDateString(),
        ]);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        $row = SmsOutboxMessage::first();
        $this->assertSame(
            "PILGRIM CHRISTIAN COLLEGE\n".
            "Attendance Alert: Alex Santos\n".
            "Status: TAPPED OUT\n".
            "Time: 3:45 PM (GMT+8)\n".
            "Date: Sep 10, 2026\n".
            'Station: Main Gate',
            $row->message,
        );

        // No character outside the GSM-7 basic alphabet — otherwise the
        // whole message silently drops from 160 to 70 chars/segment.
        $this->assertMatchesRegularExpression('/^[\x00-\x7F\n]*$/', $row->message);
    }

    public function test_sms_is_not_sent_when_notify_sms_is_disabled(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Student]);
        $parent = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'phone_number' => '+639171234567',
            'notification_preferences' => ['notify_in' => true, 'notify_out' => true, 'notify_sms' => false],
        ]);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        $event = $this->makeEvent($tenant, $station, $student, TapEventType::In);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        $this->assertDatabaseCount('sms_outbox', 0, 'mysql');
    }

    public function test_sms_is_not_sent_without_a_phone_number_even_if_opted_in(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Student]);
        $parent = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'phone_number' => null,
            'notification_preferences' => ['notify_in' => true, 'notify_out' => true, 'notify_sms' => true],
        ]);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        $event = $this->makeEvent($tenant, $station, $student, TapEventType::In);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        $this->assertDatabaseCount('sms_outbox', 0, 'mysql');
    }

    public function test_sms_still_respects_the_muted_direction_gate_shared_with_push(): void
    {
        $tenant = Tenant::factory()->create();
        $station = Station::factory()->for($tenant)->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Student]);
        $parent = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'phone_number' => '+639171234567',
            // OUT alerts muted for both channels, notify_sms otherwise on.
            'notification_preferences' => ['notify_in' => true, 'notify_out' => false, 'notify_sms' => true],
        ]);
        $parent->studentLinks()->create(['person_id' => $student->id]);

        $event = $this->makeEvent($tenant, $station, $student, TapEventType::Out);

        (new DispatchParentTapNotification($tenant->id, $event->id))->handle(app(FcmClient::class));

        $this->assertDatabaseCount('sms_outbox', 0, 'mysql');
    }
}
