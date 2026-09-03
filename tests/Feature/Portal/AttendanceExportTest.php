<?php

namespace Tests\Feature\Portal;

use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_csv_export_contains_the_filtered_rows(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $station = Station::factory()->for($tenant)->create(['name' => 'Main Gate']);

        TapEvent::factory()->for($station)->create(['card_uid' => 'EXPORT01', 'event_type' => 'IN']);
        TapEvent::factory()->for($station)->create(['card_uid' => 'OTHER99', 'event_type' => 'OUT']);

        $response = $this->actingAs($admin)->get(route('portal.attendance.export', ['card_uid' => 'EXPORT01']));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('content-type'));

        $content = $response->streamedContent();
        $this->assertStringContainsString('EXPORT01', $content);
        $this->assertStringNotContainsString('OTHER99', $content);
        $this->assertStringContainsString('Main Gate', $content);
    }

    public function test_export_is_tenant_isolated(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $adminA = User::factory()->tenantAdmin($tenantA)->create();
        $stationA = Station::factory()->for($tenantA)->create();
        $stationB = Station::factory()->for($tenantB)->create();

        TapEvent::factory()->for($stationA)->create(['card_uid' => 'TENANTA1']);
        TapEvent::factory()->for($stationB)->create(['card_uid' => 'TENANTB1']);

        $content = $this->actingAs($adminA)->get(route('portal.attendance.export'))->streamedContent();

        $this->assertStringContainsString('TENANTA1', $content);
        $this->assertStringNotContainsString('TENANTB1', $content);
    }
}
