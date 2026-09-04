<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * One-time cutover tool: copies every tenant's rows for the 11 tables that
 * used to live in the shared central database into that tenant's own new
 * physical database (adaptive_station_{code}). Run once, by hand, during
 * the restructure — not part of normal request handling. Source rows are
 * left untouched (never deleted) so the operator can verify counts match on
 * both sides before manually clearing the old central copies.
 */
class BackfillTenantDatabasesCommand extends Command
{
    protected $signature = 'tenants:backfill-databases {code? : A specific tenant code to backfill; omit to backfill every tenant}';

    protected $description = 'Copy a tenant\'s legacy shared-database rows into its own new physical database';

    /**
     * Tables keyed directly by tenant_id — copied with a plain WHERE filter.
     */
    protected const TENANT_ID_TABLES = [
        'stations', 'people', 'rfid_cards', 'tap_events', 'master_data_changes',
        'device_heartbeats', 'integration_profiles', 'integration_runs',
        'import_batches', 'import_exceptions',
    ];

    public function handle(): int
    {
        if (! $this->anyLegacyTableExists()) {
            $this->info('No legacy shared-database tables found on the central connection — nothing to backfill.');

            return self::SUCCESS;
        }

        $code = $this->argument('code');
        $tenants = $code !== null ? Tenant::where('code', $code)->get() : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error($code !== null ? "No tenant found with code [{$code}]." : 'No tenants exist yet.');

            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $this->backfillTenant($tenant);
        }

        return self::SUCCESS;
    }

    protected function backfillTenant(Tenant $tenant): void
    {
        $this->info("Backfilling tenant [{$tenant->code}]...");

        TenantDatabase::createDatabase($tenant->code);
        Artisan::call('tenants:migrate', ['code' => $tenant->code]);
        TenantDatabase::use($tenant);

        foreach (static::TENANT_ID_TABLES as $table) {
            if (! DB::connection('mysql')->getSchemaBuilder()->hasTable($table)) {
                continue;
            }

            $rows = DB::connection('mysql')->table($table)->where('tenant_id', $tenant->id)->get();
            $this->copyRows($table, $rows);
        }

        // device_sync_cursors has no tenant_id of its own — join through the
        // legacy central `stations` copy to find this tenant's rows.
        if (DB::connection('mysql')->getSchemaBuilder()->hasTable('device_sync_cursors')
            && DB::connection('mysql')->getSchemaBuilder()->hasTable('stations')) {
            $rows = DB::connection('mysql')->table('device_sync_cursors')
                ->join('stations', 'stations.id', '=', 'device_sync_cursors.station_id')
                ->where('stations.tenant_id', $tenant->id)
                ->select('device_sync_cursors.*')
                ->get();
            $this->copyRows('device_sync_cursors', $rows);
        }
    }

    protected function copyRows(string $table, Collection $rows): void
    {
        if ($rows->isEmpty()) {
            return;
        }

        $data = $rows->map(fn ($row) => (array) $row)->all();

        foreach (array_chunk($data, 500) as $chunk) {
            DB::connection('tenant')->table($table)->insertOrIgnore($chunk);
        }

        $sourceCount = count($data);
        $destCount = DB::connection('tenant')->table($table)->count();
        $this->line("  {$table}: copied {$sourceCount} rows (destination now has {$destCount}).");
    }

    /**
     * True if the central connection still physically has any of the tables
     * that used to live there before the per-tenant-database restructure —
     * false once an operator has cleared them after verifying a backfill.
     */
    protected function anyLegacyTableExists(): bool
    {
        $schema = DB::connection('mysql')->getSchemaBuilder();

        foreach (static::TENANT_ID_TABLES as $table) {
            if ($schema->hasTable($table)) {
                return true;
            }
        }

        return false;
    }
}
