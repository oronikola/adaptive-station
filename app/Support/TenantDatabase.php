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
    public static function databaseNameFor(string $code): string
    {
        return "adaptive_station_{$code}";
    }

    /**
     * Points the 'tenant' connection at this tenant's own database and
     * discards any previously-open connection to a different tenant's
     * database, so a stale PDO handle from a prior request/job in the same
     * process can never leak one tenant's query onto another's data.
     */
    public static function use(Tenant $tenant): void
    {
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
        $database = static::databaseNameFor($code);

        DB::statement("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }

    public static function dropDatabase(string $code): void
    {
        $database = static::databaseNameFor($code);

        DB::statement("DROP DATABASE IF EXISTS `{$database}`");
    }
}
