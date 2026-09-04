<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantDatabase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Everything else in the suite runs against one fixed shared tenant test
 * database (TenantDatabase's own docblock) for speed. These tests are the
 * deliberate exception: they flip TenantDatabase::$forceRealDatabaseOperations
 * to prove the actual CREATE DATABASE / migrate / DROP DATABASE mechanics
 * genuinely work, using a real throwaway database on the test MySQL server
 * that's always cleaned up afterward.
 */
class TenantDatabaseProvisioningTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantDatabase::$forceRealDatabaseOperations = false;

        // Restore the 'tenant' connection to the shared fixed test database
        // — this test deliberately pointed it at a real throwaway database
        // above, which is dropped by now and must never leak into the next
        // test in this same PHPUnit process.
        config(['database.connections.tenant.database' => env('TENANT_DB_DATABASE')]);
        DB::purge('tenant');

        parent::tearDown();
    }

    public function test_provisioning_a_tenant_creates_and_migrates_a_real_physical_database(): void
    {
        TenantDatabase::$forceRealDatabaseOperations = true;

        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $code = 'real-provision-test-'.uniqid();

        try {
            $tenant = Tenant::provision(['name' => 'Real Provision Test', 'code' => $code, 'timezone' => 'Asia/Manila'], $platformAdmin);

            $databaseName = TenantDatabase::databaseNameFor($code);
            $exists = DB::connection('mysql')->select(
                'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
                [$databaseName],
            );
            $this->assertNotEmpty($exists, "Expected database [{$databaseName}] to exist.");

            TenantDatabase::use($tenant);
            foreach (['stations', 'people', 'rfid_cards', 'tap_events', 'master_data_changes', 'device_heartbeats', 'device_sync_cursors', 'integration_profiles', 'integration_runs', 'import_batches', 'import_exceptions'] as $table) {
                $this->assertTrue(
                    Schema::connection('tenant')->hasTable($table),
                    "Expected tenant database to have a [{$table}] table.",
                );
            }
        } finally {
            TenantDatabase::dropDatabase($code);
        }
    }
}
