<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Guardians auto-provisioned from an essentiel tap resolve (see
 * EssentielTapResolver::syncGuardians()) have only a name and phone number
 * — essentiel never returns a guardian email — so email can no longer be
 * required. Uses a raw ALTER TABLE rather than Schema::table()->change(),
 * since this project has no doctrine/dbal dependency installed.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::connection('mysql')->statement('ALTER TABLE parent_accounts MODIFY email VARCHAR(255) NULL');
    }

    public function down(): void
    {
        DB::connection('mysql')->statement(
            "UPDATE parent_accounts SET email = CONCAT('no-email-', id, '@placeholder.invalid') WHERE email IS NULL"
        );
        DB::connection('mysql')->statement('ALTER TABLE parent_accounts MODIFY email VARCHAR(255) NOT NULL');
    }
};
