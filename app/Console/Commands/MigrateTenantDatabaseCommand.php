<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

/**
 * Runs database/migrations/tenant (the 11 tenant-owned tables) against one
 * tenant's physical database, or every tenant's if none is specified — used
 * both by Tenant::provision() right after a new tenant's database is
 * created, and by ops when rolling out a new tenant-table schema change to
 * every existing tenant database at once.
 */
class MigrateTenantDatabaseCommand extends Command
{
    protected $signature = 'tenants:migrate {code? : A specific tenant code to migrate; omit to migrate every tenant}';

    protected $description = "Run the tenant-table migrations against one or every tenant's own database";

    public function handle(): int
    {
        $code = $this->argument('code');

        $tenants = $code !== null
            ? Tenant::where('code', $code)->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error($code !== null ? "No tenant found with code [{$code}]." : 'No tenants exist yet.');

            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $this->info("Migrating tenant [{$tenant->code}]...");

            TenantDatabase::use($tenant);

            Artisan::call('migrate', [
                '--path' => 'database/migrations/tenant',
                '--database' => 'tenant',
                '--force' => true,
            ], $this->output);
        }

        return self::SUCCESS;
    }
}
