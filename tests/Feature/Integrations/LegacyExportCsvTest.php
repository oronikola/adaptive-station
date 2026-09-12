<?php

namespace Tests\Feature\Integrations;

use App\Enums\StationStatus;
use App\Models\IntegrationProfile;
use App\Models\Person;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LegacyExportCsvTest extends TestCase
{
    use RefreshDatabase;

    protected function seedTapEvent(Tenant $tenant): void
    {
        $station = Station::factory()->for($tenant)->create([
            'status' => StationStatus::Active,
            'legacy_station_id' => '9',
        ]);
        $person = Person::factory()->for($tenant)->create([
            'source_system' => 'legacy_mysql',
            'source_record_id' => '101',
            'display_name' => 'Jamie Cruz',
        ]);

        TapEvent::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'station_id' => $station->id,
            'person_id' => $person->id,
            'card_uid' => 'CARD001',
            'person_type' => 'student',
            'event_type' => 'IN',
            'occurred_at' => '2026-09-01 07:00:00',
            'occurred_offset_minutes' => 480,
            'received_at' => '2026-09-01 07:00:01',
            'attendance_date_local' => '2026-09-01',
        ]);
    }

    public function test_a_tenant_admin_can_download_the_legacy_shaped_csv(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $this->seedTapEvent($tenant);

        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy Test',
            'driver' => 'legacy_mysql',
            'direction' => 'bidirectional',
            'status' => 'active',
            'config_encrypted' => ['host' => 'unused-for-csv'],
        ], $admin);

        $response = $this->actingAs($admin)->get(route('portal.integrations.export-csv', [
            'profile' => $profile->id,
            'date_from' => '2026-09-01',
            'date_to' => '2026-09-01',
        ]));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $lines = array_values(array_filter(explode("\n", str_replace("\r\n", "\n", $content))));

        $this->assertSame('tdate,ttime,tapstate,studid,utype,mode,tapstatus,station_id,createddatetime', $lines[0]);
        $this->assertStringContainsString('2026-09-01', $lines[1]);
        $this->assertStringContainsString(',1,', $lines[1]); // tapstate for IN
        $this->assertStringContainsString('101', $lines[1]); // studid, from source_record_id
        $this->assertStringContainsString('9', $lines[1]); // legacy_station_id
    }

    public function test_a_tenant_admin_cannot_download_another_tenants_csv(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $adminB = User::factory()->tenantAdmin($tenantB)->create();

        $profileB = IntegrationProfile::createForTenant($tenantB->id, [
            'name' => 'Tenant B Legacy',
            'driver' => 'legacy_mysql',
            'direction' => 'bidirectional',
            'status' => 'active',
            'config_encrypted' => ['host' => 'db-b'],
        ], $adminB);

        $this->actingAs($adminA)->get(route('portal.integrations.export-csv', [
            'profile' => $profileB->id,
            'date_from' => '2026-09-01',
            'date_to' => '2026-09-01',
        ]))->assertNotFound();
    }

    public function test_date_range_is_required(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy Test',
            'driver' => 'legacy_mysql',
            'direction' => 'bidirectional',
            'status' => 'active',
            'config_encrypted' => ['host' => 'unused'],
        ], $admin);

        $this->actingAs($admin)->get(route('portal.integrations.export-csv', ['profile' => $profile->id]))
            ->assertSessionHasErrors(['date_from', 'date_to']);
    }
}
