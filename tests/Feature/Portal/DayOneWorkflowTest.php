<?php

namespace Tests\Feature\Portal;

use App\Enums\StationStatus;
use App\Models\Person;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Reproduces IP-004's own acceptance test (work item 9): create person,
 * assign card, sync kiosk (via the real Milestone 2 device API), tap,
 * locate event, export report.
 */
class DayOneWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_person_assign_card_tap_locate_and_export(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        ['code' => $code] = StationActivationCode::issueFor($station, $admin);
        $activateResponse = $this->postJson('/api/v1/device/activate', ['activation_code' => $code]);
        $activateResponse->assertCreated();
        $token = $activateResponse->json('credential_token');

        $createResponse = $this->actingAs($admin)->post(route('portal.people.store'), [
            'person_type' => 'student',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
        ]);
        $person = Person::allTenants()->where('tenant_id', $tenant->id)->firstOrFail();
        $createResponse->assertRedirect(route('portal.people.edit', $person));

        $this->actingAs($admin)->post(route('portal.rfid-cards.store'), [
            'person_id' => $person->id,
            'card_uid' => 'DAYONE01',
        ])->assertRedirect();

        $eventId = (string) Str::uuid();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/events/batch', [
                'events' => [[
                    'id' => $eventId,
                    'card_uid' => 'DAYONE01',
                    'event_type' => 'IN',
                    'occurred_at' => now()->toIso8601String(),
                    'occurred_offset_minutes' => 480,
                ]],
            ])
            ->assertOk()
            ->assertJson(['accepted_event_ids' => [$eventId]]);

        $today = now()->timezone($tenant->timezone)->toDateString();

        $this->actingAs($admin)
            ->get(route('portal.attendance.index', ['date_from' => $today, 'date_to' => $today]))
            ->assertInertia(fn ($page) => $page
                ->has('events.data', 1)
                ->where('events.data.0.id', $eventId)
                ->where('events.data.0.person.display_name', 'Ada Lovelace'));

        $exportResponse = $this->actingAs($admin)
            ->get(route('portal.attendance.export', ['date_from' => $today, 'date_to' => $today]));

        $exportResponse->assertOk();
        $this->assertStringContainsString('DAYONE01', $exportResponse->streamedContent());
    }
}
