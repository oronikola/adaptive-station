<?php

namespace App\Support;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

/**
 * Single choke point for "which physical database does this tenant's data
 * live in" — every request/job/command that's about to touch a tenant-owned
 * model (Station, Person, RfidCard, TapEvent, ...) must call self::use()
 * first. Central tables (Tenant, User, StationCredential,
 * StationActivationCode, AuditLog) never go through this — they always live
 * on the default connection.
 */
class TenantDatabase
{
    /**
     * Test-only escape hatch: the testing environment normally short-circuits
     * every method below (the whole suite shares one fixed physical database
     * for speed — see the class docblock), but a handful of dedicated tests
     * exist specifically to prove real database provisioning/deletion works.
     * Those tests flip this on, exercise a real throwaway tenant code, then
     * flip it back off — greppable and deliberate, same spirit as
     * HasTenantScope::allTenants().
     */
    public static bool $forceRealDatabaseOperations = false;

    public static function databaseNameFor(string $code): string
    {
        return "adaptive_station_{$code}";
    }

    protected static function skipInTesting(): bool
    {
        return app()->environment('testing') && ! static::$forceRealDatabaseOperations;
    }

    /**
     * Points the 'tenant' connection at this tenant's own database and
     * discards any previously-open connection to a different tenant's
     * database, so a stale PDO handle from a prior request/job in the same
     * process can never leak one tenant's query onto another's data.
     *
     * No-op in the testing environment: the whole suite shares one fixed
     * physical database for the 'tenant' connection (TENANT_DB_DATABASE, see
     * config/database.php + tests/bootstrap.php) rather than provisioning a
     * real database per test tenant. Different test tenants' rows still
     * coexist safely in that one database because TenantScope/tenant_id
     * columns are kept as a real, tested isolation layer, not removed just
     * because physical separation exists in production.
     */
    public static function use(Tenant $tenant): void
    {
        if (static::skipInTesting()) {
            return;
        }

        $database = static::databaseNameFor($tenant->code);

        if (config('database.connections.tenant.database') === $database) {
            return;
        }

        config(['database.connections.tenant.database' => $database]);
        DB::purge('tenant');
    }

    /**
     * Creates the tenant's physical database if it doesn't already exist.
     * Runs on the default connection, which is expected to have CREATE
     * DATABASE privileges — the 'tenant' connection itself only needs
     * privileges on databases it's been pointed at, not server-wide DDL.
     */
    public static function createDatabase(string $code): void
    {
        if (static::skipInTesting()) {
            return;
        }

        $database = static::databaseNameFor($code);

        DB::statement("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }

    public static function dropDatabase(string $code): void
    {
        if (static::skipInTesting()) {
            return;
        }

        $database = static::databaseNameFor($code);

        DB::statement("DROP DATABASE IF EXISTS `{$database}`");
    }
}
