<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * station_credentials/station_activation_codes were originally created with
 * a foreign key to the central `stations` table, back when everything
 * shared one database. Now that `stations` lives per-tenant, that FK is
 * both meaningless (referencing a table these central tables no longer
 * share a database with, once the legacy central `stations` copy is
 * eventually dropped) and actively wrong (blocks inserting a
 * credential/activation-code for any station created after the restructure,
 * since its id never existed in the legacy central `stations` table).
 * Editing the original migration files (2026_09_02_053336/053337) already
 * removed this FK for fresh installs — this migration removes it from
 * databases that ran those original migrations before today.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('station_credentials') && $this->hasForeignKey('station_credentials', 'station_credentials_station_id_foreign')) {
            Schema::table('station_credentials', function (Blueprint $table) {
                $table->dropForeign('station_credentials_station_id_foreign');
            });
        }

        if (Schema::hasTable('station_activation_codes') && $this->hasForeignKey('station_activation_codes', 'station_activation_codes_station_id_foreign')) {
            Schema::table('station_activation_codes', function (Blueprint $table) {
                $table->dropForeign('station_activation_codes_station_id_foreign');
            });
        }
    }

    public function down(): void
    {
        // Deliberately not reversible: the legacy central `stations` table
        // this FK pointed at may no longer exist (or hold different rows)
        // by the time anyone rolls back — re-adding it isn't safe to automate.
    }

    protected function hasForeignKey(string $table, string $constraintName): bool
    {
        $connection = Schema::getConnection();
        $database = $connection->getDatabaseName();

        return $connection->table('information_schema.table_constraints')
            ->where('table_schema', $database)
            ->where('table_name', $table)
            ->where('constraint_name', $constraintName)
            ->where('constraint_type', 'FOREIGN KEY')
            ->exists();
    }
};
