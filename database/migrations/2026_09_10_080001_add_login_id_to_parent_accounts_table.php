<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds the globally-unique login credential that replaces email for
     * parent login (see the login-id plan) and backfills one for every
     * pre-existing account. Nullable at the DB level — the application
     * layer (ParentAccount::generateLoginId(), called by every creation
     * path) guarantees a value is always set for new rows; this migration
     * guarantees the same for rows that already existed.
     *
     * Uses DB::table() throughout, not the ParentAccount/Tenant Eloquent
     * models — a migration runs with no request-bound TenantContext, and
     * ParentAccount is #[ScopedBy(TenantScope::class)], which fails closed
     * (returns zero rows) with no tenant context set. Raw queries sidestep
     * that entirely.
     */
    public function up(): void
    {
        Schema::connection('mysql')->table('parent_accounts', function (Blueprint $table) {
            $table->string('login_id', 30)->nullable()->after('email');
        });
        Schema::connection('mysql')->table('parent_accounts', function (Blueprint $table) {
            $table->unique('login_id', 'uq_parent_accounts_login_id');
        });

        $connection = DB::connection('mysql');

        $accountsByTenant = $connection->table('parent_accounts')
            ->orderBy('created_at')
            ->get(['id', 'tenant_id', 'created_at'])
            ->groupBy('tenant_id');

        foreach ($accountsByTenant as $tenantId => $accounts) {
            $tenantCode = $connection->table('tenants')->where('id', $tenantId)->value('code');
            if ($tenantCode === null) {
                continue;
            }

            $countersByYear = [];

            foreach ($accounts as $account) {
                $year = (int) Carbon::parse($account->created_at)->format('Y');
                $countersByYear[$year] = ($countersByYear[$year] ?? 0) + 1;
                $number = $countersByYear[$year];

                $loginId = sprintf('%s%d%05d', strtoupper($tenantCode), $year, $number);

                $connection->table('parent_accounts')
                    ->where('id', $account->id)
                    ->update(['login_id' => $loginId]);
            }

            foreach ($countersByYear as $year => $count) {
                $connection->table('parent_login_sequences')->updateOrInsert(
                    ['tenant_id' => $tenantId, 'year' => $year],
                    ['next_number' => $count + 1, 'updated_at' => now(), 'created_at' => now()],
                );
            }
        }
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('parent_accounts', function (Blueprint $table) {
            $table->dropUnique('uq_parent_accounts_login_id');
            $table->dropColumn('login_id');
        });
    }
};
