<?php

namespace Tests\Feature\Integrations;

use App\Enums\ImportBatchStatus;
use App\Jobs\RunLegacyImportJob;
use App\Models\ImportBatch;
use App\Models\IntegrationProfile;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\LegacyFixtureConnection;
use Tests\TestCase;

class LegacyImportJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        LegacyFixtureConnection::register();
    }

    protected function seedFixture(): void
    {
        LegacyFixtureConnection::seedGradeLevel([
            ['id' => 1, 'levelname' => 'Grade 7'],
        ]);
        LegacyFixtureConnection::seedStudinfo([
            ['id' => 101, 'firstname' => 'Ada', 'middlename' => null, 'lastname' => 'Lovelace', 'levelid' => 1, 'section' => 'Diamond', 'rfid' => 'CARD001'],
        ]);
        LegacyFixtureConnection::seedTeacher([
            ['id' => 5, 'firstname' => 'Grace', 'lastname' => 'Hopper', 'rfid' => 'CARD777'],
        ]);
        LegacyFixtureConnection::seedTapHistory([
            ['id' => 1, 'tdate' => '2026-09-01', 'ttime' => '07:00:00', 'tapstate' => '1', 'studid' => '101', 'utype' => 7, 'mode' => 'rfid', 'tapstatus' => 'ok', 'station_id' => '9', 'createddatetime' => '2026-09-01 07:00:01'],
            ['id' => 2, 'tdate' => '2026-09-01', 'ttime' => '16:00:00', 'tapstate' => '0', 'studid' => '101', 'utype' => 7, 'mode' => 'rfid', 'tapstatus' => 'ok', 'station_id' => '9', 'createddatetime' => '2026-09-01 16:00:01'],
        ]);
    }

    protected function makeBatch(Tenant $tenant, IntegrationProfile $profile, User $actor): ImportBatch
    {
        return ImportBatch::start($tenant->id, $profile->id, 'legacy_mysql', 'Test import', $actor);
    }

    protected function makeProfile(Tenant $tenant, User $actor): IntegrationProfile
    {
        return IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy Test',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['connection' => LegacyFixtureConnection::NAME],
        ], $actor);
    }

    public function test_commit_import_creates_people_cards_and_tap_events(): void
    {
        $this->seedFixture();
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $profile = $this->makeProfile($tenant, $admin);
        $batch = $this->makeBatch($tenant, $profile, $admin);

        $this->runImport($batch, commit: true);

        $this->assertSame(2, Person::allTenants()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(2, RfidCard::allTenants()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(2, TapEvent::allTenants()->where('tenant_id', $tenant->id)->count());

        $batch->refresh();
        $this->assertSame(ImportBatchStatus::Completed, $batch->status);
        $this->assertSame(4, $batch->summary['source']);
        $this->assertSame(4, $batch->summary['imported']);
    }

    public function test_rerunning_commit_import_is_idempotent(): void
    {
        $this->seedFixture();
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $profile = $this->makeProfile($tenant, $admin);

        $firstBatch = $this->makeBatch($tenant, $profile, $admin);
        $this->runImport($firstBatch, commit: true);

        $secondBatch = $this->makeBatch($tenant, $profile, $admin);
        $this->runImport($secondBatch, commit: true);

        $this->assertSame(2, Person::allTenants()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(2, RfidCard::allTenants()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(2, TapEvent::allTenants()->where('tenant_id', $tenant->id)->count());

        $secondBatch->refresh();
        $this->assertSame(0, $secondBatch->summary['imported']);
        $this->assertSame(4, $secondBatch->summary['skipped_known']);
    }

    public function test_preview_mode_writes_nothing(): void
    {
        $this->seedFixture();
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $profile = $this->makeProfile($tenant, $admin);
        $batch = $this->makeBatch($tenant, $profile, $admin);

        $this->runImport($batch, commit: false);

        $this->assertSame(0, Person::allTenants()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(0, TapEvent::allTenants()->where('tenant_id', $tenant->id)->count());

        $batch->refresh();
        $this->assertSame(ImportBatchStatus::Validating, $batch->status);
        // Roster (2 people) previews as "would import"; the 2 tap_history rows
        // reference people that preview mode never actually inserts, so they
        // preview as manual_review (unresolvable), not imported — this is why
        // the recommended flow commits roster before previewing tap history.
        $this->assertSame(2, $batch->summary['imported']);
        $this->assertSame(2, $batch->summary['manual_review']);
        $this->assertSame(4, $batch->summary['source']);
    }

    public function test_reconciliation_invariant_holds(): void
    {
        $this->seedFixture();
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $profile = $this->makeProfile($tenant, $admin);
        $batch = $this->makeBatch($tenant, $profile, $admin);

        $this->runImport($batch, commit: true);
        $batch->refresh();

        $summary = $batch->summary;
        $this->assertSame(
            $summary['source'],
            $summary['imported'] + $summary['skipped_known'] + $summary['rejected'] + $summary['manual_review'],
        );
    }

    protected function runImport(ImportBatch $batch, bool $commit): void
    {
        (new RunLegacyImportJob($batch->id, $commit, '2026-09-01', '2026-09-30', $batch->created_by_user_id))->handle();
    }
}
