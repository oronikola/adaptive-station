<?php

namespace Tests\Feature\Integrations;

use App\Jobs\RunLegacyImportJob;
use App\Models\ImportBatch;
use App\Models\ImportException;
use App\Models\IntegrationProfile;
use App\Models\Person;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\LegacyFixtureConnection;
use Tests\TestCase;

class LegacyImportAmbiguousMatchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        LegacyFixtureConnection::register();
    }

    public function test_tap_history_referencing_an_unknown_studid_creates_an_import_exception_not_a_silent_merge(): void
    {
        LegacyFixtureConnection::seedTapHistory([
            ['id' => 1, 'tdate' => '2026-09-01', 'ttime' => '07:00:00', 'tapstate' => '1', 'studid' => '999', 'utype' => 7, 'mode' => 'rfid', 'tapstatus' => 'ok', 'station_id' => '9', 'createddatetime' => '2026-09-01 07:00:01'],
        ]);

        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy Test',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['connection' => LegacyFixtureConnection::NAME],
        ], $admin);
        $batch = ImportBatch::start($tenant->id, $profile->id, 'legacy_mysql', 'Test import', $admin);

        (new RunLegacyImportJob($batch->id, true, '2026-09-01', '2026-09-30', $admin->id))->handle();

        $this->assertSame(0, Person::allTenants()->where('tenant_id', $tenant->id)->count());

        $exception = ImportException::allTenants()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame('missing_reference', $exception->exception_type->value);
        $this->assertSame('999', $exception->payload['studid']);
        $this->assertSame('open', $exception->resolution->value);

        $batch->refresh();
        $this->assertSame(1, $batch->summary['manual_review']);
        $this->assertSame(0, $batch->summary['imported']);
    }

    public function test_unresolvable_exception_can_be_resolved(): void
    {
        LegacyFixtureConnection::seedTapHistory([
            ['id' => 1, 'tdate' => '2026-09-01', 'ttime' => '07:00:00', 'tapstate' => '1', 'studid' => '999', 'utype' => 7, 'mode' => 'rfid', 'tapstatus' => 'ok', 'station_id' => '9', 'createddatetime' => '2026-09-01 07:00:01'],
        ]);

        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy Test',
            'driver' => 'legacy_mysql',
            'direction' => 'import_only',
            'config_encrypted' => ['connection' => LegacyFixtureConnection::NAME],
        ], $admin);
        $batch = ImportBatch::start($tenant->id, $profile->id, 'legacy_mysql', 'Test import', $admin);

        (new RunLegacyImportJob($batch->id, true, '2026-09-01', '2026-09-30', $admin->id))->handle();

        $exception = ImportException::allTenants()->where('tenant_id', $tenant->id)->firstOrFail();
        $exception->resolve($admin, \App\Enums\ImportExceptionResolution::Ignored, 'Legacy studid predates roster import.');

        $this->assertSame('ignored', $exception->fresh()->resolution->value);
        $this->assertNotNull($exception->fresh()->resolved_at);
        $this->assertSame($admin->id, $exception->fresh()->resolved_by_user_id);
    }
}
