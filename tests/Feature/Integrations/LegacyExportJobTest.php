<?php

namespace Tests\Feature\Integrations;

use App\Enums\IntegrationRunDirection;
use App\Enums\StationStatus;
use App\Jobs\RunLegacyExportJob;
use App\Models\IntegrationProfile;
use App\Models\IntegrationRun;
use App\Models\Person;
use App\Models\Station;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\LegacyFixtureConnection;
use Tests\TestCase;

class LegacyExportJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        LegacyFixtureConnection::register();
    }

    protected function seedTapEvent(Tenant $tenant): void
    {
        $station = Station::factory()->for($tenant)->create([
            'status' => StationStatus::Active,
            'legacy_station_id' => '9',
        ]);
        $person = Person::factory()->for($tenant)->create([
            'source_system' => 'legacy_mysql',
            'source_record_id' => '101',
        ]);

        TapEvent::importOne($tenant->id, [
            'station_id' => $station->id,
            'person_id' => $person->id,
            'card_uid' => 'CARD001',
            'person_type' => 'student',
            'event_type' => 'IN',
            'occurred_at' => '2026-09-01 07:00:00',
            'occurred_offset_minutes' => 480,
            'received_at' => '2026-09-01 07:00:01',
            'attendance_date_local' => '2026-09-01',
            'source_system' => 'adaptive_station',
        ]);
    }

    protected function makeRun(Tenant $tenant, User $admin): IntegrationRun
    {
        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy Test',
            'driver' => 'legacy_mysql',
            'direction' => 'export_only',
            'config_encrypted' => ['connection' => LegacyFixtureConnection::NAME],
        ], $admin);

        return IntegrationRun::start($profile, IntegrationRunDirection::Export);
    }

    public function test_export_writes_a_legacy_taphistory_row(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $this->seedTapEvent($tenant);
        $run = $this->makeRun($tenant, $admin);

        (new RunLegacyExportJob($run->id, $tenant->id, '2026-09-01', '2026-09-01'))->handle();

        $this->assertSame(1, DB::connection(LegacyFixtureConnection::NAME)->table('taphistory')->count());

        $run->refresh();
        $this->assertSame(1, $run->summary['exported']);
        $this->assertSame(0, $run->summary['already_present']);
    }

    public function test_rerunning_export_over_the_same_range_produces_no_duplicate_rows(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $this->seedTapEvent($tenant);
        $run = $this->makeRun($tenant, $admin);

        (new RunLegacyExportJob($run->id, $tenant->id, '2026-09-01', '2026-09-01'))->handle();
        $this->assertSame(1, DB::connection(LegacyFixtureConnection::NAME)->table('taphistory')->count());

        $secondRun = $this->makeRun($tenant, $admin);
        (new RunLegacyExportJob($secondRun->id, $tenant->id, '2026-09-01', '2026-09-01'))->handle();

        $this->assertSame(1, DB::connection(LegacyFixtureConnection::NAME)->table('taphistory')->count());

        $secondRun->refresh();
        $this->assertSame(0, $secondRun->summary['exported']);
        $this->assertSame(1, $secondRun->summary['already_present']);
    }
}
