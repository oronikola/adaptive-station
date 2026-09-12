<?php

namespace Tests\Feature\Portal;

use App\Enums\StationStatus;
use App\Models\IntegrationProfile;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Rounds out AdaptivestationAdminPortalAccessTest's coverage (which already
 * proves People + portal Users) across every other Portal resource with a
 * create/edit/delete surface — RFID cards, stations, parents, integrations,
 * and CSV imports — confirming the same tenant_admin-equivalent access
 * actually holds everywhere, not just the couple of resources exercised
 * first.
 */
class AdaptivestationAdminCrudParityTest extends TestCase
{
    use RefreshDatabase;

    private function actingForSchool(Tenant $tenant): User
    {
        $admin = User::factory()->adaptivestationAdmin()->create();
        $this->actingAs($admin)->post(route('oversight.schools.select', $tenant));

        return $admin;
    }

    // ── RFID Cards ───────────────────────────────────────────────────────

    public function test_it_can_assign_a_card_to_a_person(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);
        $person = Person::factory()->for($tenant)->create();

        $response = $this->actingAs($admin)->post(route('portal.rfid-cards.store'), [
            'person_id' => $person->id,
            'card_uid' => 'abc123',
        ]);

        $response->assertRedirect(route('portal.people.edit', $person));
        $card = RfidCard::allTenants()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame('ABC123', $card->card_uid);
    }

    public function test_it_can_replace_and_deactivate_a_card(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);
        $person = Person::factory()->for($tenant)->create();
        $oldCard = RfidCard::factory()->for($tenant)->for($person)->create(['card_uid' => 'OLD001']);

        $this->actingAs($admin)->post(route('portal.rfid-cards.replace', $oldCard), [
            'card_uid' => 'NEW001',
        ])->assertRedirect(route('portal.people.edit', $person));

        $this->assertFalse($oldCard->fresh()->is_active);
        $newCard = RfidCard::allTenants()->where('card_uid', 'NEW001')->firstOrFail();

        $this->actingAs($admin)->patch(route('portal.rfid-cards.deactivate', $newCard))
            ->assertRedirect();
        $this->assertFalse($newCard->fresh()->is_active);
    }

    // ── Stations ─────────────────────────────────────────────────────────

    public function test_it_can_update_station_configuration_and_manage_credentials(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        $this->actingAs($admin)->patch(route('portal.stations.configuration', $station), [
            'configuration' => ['clock_format' => '24h'],
        ])->assertRedirect(route('portal.stations.show', $station));
        $this->assertSame(['clock_format' => '24h'], $station->fresh()->configuration);

        $issueResponse = $this->actingAs($admin)->post(route('portal.stations.credentials.store', $station), [
            'label' => 'Front Desk',
        ]);
        $issueResponse->assertSessionHas('deviceToken');

        $credential = StationCredential::allTenants()->where('station_id', $station->id)->firstOrFail();
        $this->actingAs($admin)
            ->patch(route('portal.stations.credentials.revoke', [$station, $credential]))
            ->assertRedirect();
        $this->assertNotNull($credential->fresh()->revoked_at);
    }

    public function test_it_can_issue_a_station_activation_code(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);

        $this->actingAs($admin)->post(route('portal.stations.activation-code', $station))
            ->assertRedirect(route('portal.stations.show', $station))
            ->assertSessionHas('activationCode');
    }

    // ── Parents ──────────────────────────────────────────────────────────

    public function test_it_can_create_update_and_deactivate_a_parent_account(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);
        $student = Person::factory()->for($tenant)->create();

        $this->actingAs($admin)->post(route('portal.parents.store'), [
            'name' => 'Test Guardian',
            'email' => 'guardian@example.test',
            'password' => 'parent-password-123',
            'password_confirmation' => 'parent-password-123',
            'student_ids' => [$student->id],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $parent = ParentAccount::allTenants()->where('tenant_id', $tenant->id)->sole();
        $this->assertSame([$student->id], $parent->authorizedStudents()->pluck('id')->all());

        $this->actingAs($admin)->put(route('portal.parents.update', $parent), [
            'name' => 'Updated Guardian',
            'email' => $parent->email,
            'password' => '',
            'password_confirmation' => '',
            'student_ids' => [$student->id],
        ])->assertSessionHasNoErrors();
        $this->assertSame('Updated Guardian', $parent->fresh()->name);

        $this->actingAs($admin)->patch(route('portal.parents.status', $parent), ['is_active' => false])
            ->assertRedirect();
        $this->assertFalse($parent->fresh()->is_active);
    }

    // ── Integrations ─────────────────────────────────────────────────────

    public function test_it_can_create_and_update_an_integration_profile(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $this->actingAs($admin)->post(route('portal.integrations.store'), [
            'name' => 'Legacy System',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config' => json_encode(['host' => '127.0.0.1']),
        ])->assertRedirect(route('portal.integrations.index'));

        $profile = IntegrationProfile::allTenants()->where('tenant_id', $tenant->id)->sole();
        $this->assertSame('Legacy System', $profile->name);

        $this->actingAs($admin)->put(route('portal.integrations.update', $profile), [
            'name' => 'Legacy System Renamed',
            'direction' => 'bidirectional',
        ])->assertRedirect(route('portal.integrations.edit', $profile));
        $this->assertSame('Legacy System Renamed', $profile->fresh()->name);
    }

    // ── Imports (CSV roster) ─────────────────────────────────────────────

    public function test_it_can_import_a_roster_csv(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = $this->actingForSchool($tenant);

        $csv = "external_id,person_type,first_name,last_name,grade_level,section\n"
            ."S-1,student,Alex,Santos,5,A\n";
        $path = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($path, $csv);
        $file = new UploadedFile($path, 'roster.csv', 'text/csv', null, true);

        $response = $this->actingAs($admin)->post(route('portal.imports.csv.store'), [
            'file' => $file,
            'commit' => true,
        ]);

        $response->assertSessionDoesntHaveErrors();
        $person = Person::allTenants()->where('tenant_id', $tenant->id)->where('external_id', 'S-1')->first();
        $this->assertNotNull($person);
    }
}
