<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * station_credentials/station_activation_codes previously resolved their
 * tenant only via a whereHas('station', ...) join. Once `stations` moves to
 * a separate per-tenant database, that join is impossible — both tables need
 * their own tenant_id column. Backfilled here from the (at migration-run
 * time, still-present) central `stations` table for any pre-existing rows —
 * safe because this transitional environment still has that table physically
 * present in the central database until the per-tenant cutover completes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('station_credentials', function (Blueprint $table) {
            $table->uuid('tenant_id')->nullable()->after('station_id');
            $table->foreign('tenant_id')->references('id')->on('tenants');
        });

        Schema::table('station_activation_codes', function (Blueprint $table) {
            $table->uuid('tenant_id')->nullable()->after('station_id');
            $table->foreign('tenant_id')->references('id')->on('tenants');
        });

        if (Schema::hasTable('stations')) {
            DB::statement(
                'UPDATE station_credentials sc '.
                'JOIN stations s ON s.id = sc.station_id '.
                'SET sc.tenant_id = s.tenant_id '.
                'WHERE sc.tenant_id IS NULL',
            );

            DB::statement(
                'UPDATE station_activation_codes sac '.
                'JOIN stations s ON s.id = sac.station_id '.
                'SET sac.tenant_id = s.tenant_id '.
                'WHERE sac.tenant_id IS NULL',
            );
        }

        Schema::table('station_credentials', function (Blueprint $table) {
            $table->index(['tenant_id'], 'ix_station_credentials_tenant');
        });

        Schema::table('station_activation_codes', function (Blueprint $table) {
            $table->index(['tenant_id'], 'ix_station_activation_codes_tenant');
        });
    }

    public function down(): void
    {
        Schema::table('station_credentials', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn('tenant_id');
        });

        Schema::table('station_activation_codes', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn('tenant_id');
        });
    }
};
