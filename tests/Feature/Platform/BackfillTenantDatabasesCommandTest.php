<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Simulates the real cutover scenario: a "legacy" central `people` table
 * left over from before the per-tenant-database restructure (created here
 * by hand, since this test suite's own central connection never has one —
 * see BackfillTenantDatabasesCommand's docblock), backfilled into a real
 * throwaway per-tenant database via the force-real escape hatch (see
 * TenantDatabaseProvisioningTest).
 */
class BackfillTenantDatabasesCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Schema::connection('mysql')->dropIfExists('people');
        TenantDatabase::$forceRealDatabaseOperations = false;
        config(['database.connections.tenant.database' => env('TENANT_DB_DATABASE')]);
        DB::purge('tenant');

        parent::tearDown();
    }

    public function test_backfill_copies_legacy_central_rows_into_the_tenants_new_database(): void
    {
        TenantDatabase::$forceRealDatabaseOperations = true;

        // Schema::create() below is DDL, which implicitly commits MySQL's
        // current transaction — so RefreshDatabase's usual rollback can't
        // clean up rows created in this test; this tenant is deleted by
        // hand at the end instead.
        $tenant = Tenant::factory()->create(['code' => 'backfill-test-'.uniqid()]);

        // A minimal legacy `people` table on the central connection, exactly
        // as it would be found leftover from before the restructure.
        Schema::connection('mysql')->create('people', function ($table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('first_name');
            $table->string('last_name');
        });

        $personId = (string) Str::uuid();
        DB::connection('mysql')->table('people')->insert([
            'id' => $personId, 'tenant_id' => $tenant->id, 'first_name' => 'Ada', 'last_name' => 'Lovelace',
        ]);

        try {
            $this->artisan('tenants:backfill-databases', ['code' => $tenant->code])->assertSuccessful();

            TenantDatabase::use($tenant);
            $this->assertDatabaseHas('people', ['id' => $personId, 'first_name' => 'Ada'], 'tenant');

            // Source row is left untouched, never deleted by the backfill.
            $this->assertDatabaseHas('people', ['id' => $personId], 'mysql');
        } finally {
            TenantDatabase::dropDatabase($tenant->code);
            Tenant::where('id', $tenant->id)->delete();
        }
    }
}
