<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantDatabase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The bulk of tenant-deletion behavior (every row gone across all 15
 * tables) is already covered by TenantDeletionTest against the shared test
 * database. This is the one dedicated exception proving DROP DATABASE
 * itself genuinely runs against a real physical database — see
 * TenantDatabaseProvisioningTest's docblock for why this needs the
 * force-real escape hatch instead of running in every test.
 */
class TenantDatabaseDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantDatabase::$forceRealDatabaseOperations = false;
        config(['database.connections.tenant.database' => env('TENANT_DB_DATABASE')]);
        DB::purge('tenant');

        parent::tearDown();
    }

    public function test_deleting_a_tenant_drops_its_real_physical_database(): void
    {
        TenantDatabase::$forceRealDatabaseOperations = true;

        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $code = 'real-deletion-test-'.uniqid();

        $tenant = Tenant::provision(['name' => 'Real Deletion Test', 'code' => $code, 'timezone' => 'Asia/Manila'], $platformAdmin);
        $databaseName = TenantDatabase::databaseNameFor($code);

        $existsBefore = DB::connection('mysql')->select(
            'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
            [$databaseName],
        );
        $this->assertNotEmpty($existsBefore);

        Tenant::purge($tenant, $platformAdmin);

        $existsAfter = DB::connection('mysql')->select(
            'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
            [$databaseName],
        );
        $this->assertEmpty($existsAfter, "Expected database [{$databaseName}] to have been dropped.");
    }
}
