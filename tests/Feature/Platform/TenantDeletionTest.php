<?php

namespace Tests\Feature\Platform;

use App\Enums\StationStatus;
use App\Models\AuditLog;
use App\Models\DeviceHeartbeat;
use App\Models\DeviceSyncCursor;
use App\Models\ImportBatch;
use App\Models\ImportException;
use App\Enums\ImportExceptionType;
use App\Models\IntegrationProfile;
use App\Models\MasterDataChange;
use App\Enums\MasterDataEntityType;
use App\Enums\MasterDataOperation;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\StationCredential;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantDeletionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Builds one row in every table Tenant::purge() must clear, so the test
     * proves the full cascade — not just "the tenants row is gone".
     */
    protected function buildFullTenantGraph(): array
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant->id);

        $admin = User::factory()->tenantAdmin($tenant)->create();
        $person = Person::factory()->for($tenant)->create();
        $card = RfidCard::assign($tenant->id, $person->id, 'DELCARD1', $admin);
        $station = Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);

        ['credential' => $credential] = StationCredential::issueFor($station, 'Kiosk', $admin);
        StationActivationCode::issueFor($station, $admin);

        DeviceHeartbeat::create([
            'tenant_id' => $tenant->id, 'station_id' => $station->id,
            'pending_event_count' => 0, 'status' => 'online', 'reported_at' => now(),
        ]);
        DeviceSyncCursor::create(['station_id' => $station->id, 'master_data_version' => 0]);

        TapEvent::importOne($tenant->id, [
            'station_id' => $station->id, 'person_id' => $person->id, 'card_uid' => $card->card_uid,
            'person_type' => 'student', 'event_type' => 'IN', 'occurred_at' => now(),
            'occurred_offset_minutes' => 480, 'received_at' => now(), 'attendance_date_local' => now()->toDateString(),
        ]);
        MasterDataChange::record($tenant->id, MasterDataEntityType::Person, $person->id, MasterDataOperation::Upsert, []);

        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy', 'driver' => 'legacy_mysql', 'direction' => 'import_only',
            'config_encrypted' => ['host' => 'unused'],
        ], $admin);
        $batch = ImportBatch::start($tenant->id, $profile->id, 'legacy_mysql', 'Test batch', $admin);
        ImportException::record($tenant->id, $batch->id, 'tap_event', '1', ImportExceptionType::MissingReference, []);

        return compact('tenant', 'admin', 'person', 'card', 'station', 'credential', 'profile', 'batch');
    }

    public function test_deleting_a_tenant_removes_every_owned_row_across_all_tables(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $graph = $this->buildFullTenantGraph();
        $tenant = $graph['tenant'];
        $tenantId = $tenant->id;

        $response = $this->actingAs($platformAdmin)->delete(route('platform.tenants.destroy', $tenant), [
            'confirm_code' => $tenant->code,
        ]);

        $response->assertRedirect(route('platform.tenants.index'));

        $this->assertDatabaseMissing('tenants', ['id' => $tenantId]);
        $this->assertDatabaseMissing('users', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('people', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('rfid_cards', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('stations', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('station_credentials', ['id' => $graph['credential']->id]);
        $this->assertDatabaseMissing('station_activation_codes', ['station_id' => $graph['station']->id]);
        $this->assertDatabaseMissing('device_heartbeats', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('device_sync_cursors', ['station_id' => $graph['station']->id]);
        $this->assertDatabaseMissing('tap_events', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('master_data_changes', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('integration_profiles', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('import_batches', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('import_exceptions', ['tenant_id' => $tenantId]);
        $this->assertDatabaseMissing('audit_logs', ['tenant_id' => $tenantId]);

        // The one record of the deletion itself lives at the platform level.
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'tenant.purged',
            'tenant_id' => null,
            'entity_id' => $tenantId,
        ]);
    }

    public function test_wrong_confirmation_code_blocks_deletion(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $this->actingAs($platformAdmin)->delete(route('platform.tenants.destroy', $tenant), [
            'confirm_code' => 'not-the-real-code',
        ])->assertSessionHasErrors('confirm_code');

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id]);
    }

    public function test_missing_confirmation_code_blocks_deletion(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $this->actingAs($platformAdmin)->delete(route('platform.tenants.destroy', $tenant), [])
            ->assertSessionHasErrors('confirm_code');

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id]);
    }

    public function test_a_tenant_admin_cannot_delete_their_own_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->delete(route('platform.tenants.destroy', $tenant), [
            'confirm_code' => $tenant->code,
        ])->assertForbidden();

        $this->assertDatabaseHas('tenants', ['id' => $tenant->id]);
    }

    public function test_deleting_one_tenant_does_not_affect_another_tenants_data(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $graphToDelete = $this->buildFullTenantGraph();
        $graphToKeep = $this->buildFullTenantGraph();

        $this->actingAs($platformAdmin)->delete(route('platform.tenants.destroy', $graphToDelete['tenant']), [
            'confirm_code' => $graphToDelete['tenant']->code,
        ])->assertRedirect(route('platform.tenants.index'));

        $this->assertDatabaseHas('tenants', ['id' => $graphToKeep['tenant']->id]);
        $this->assertDatabaseHas('people', ['id' => $graphToKeep['person']->id]);
        $this->assertDatabaseHas('stations', ['id' => $graphToKeep['station']->id]);
    }
}
