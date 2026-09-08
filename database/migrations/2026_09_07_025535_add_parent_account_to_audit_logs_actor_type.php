<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE audit_logs MODIFY actor_type ENUM('user', 'station', 'parent_account', 'system')");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE audit_logs MODIFY actor_type ENUM('user', 'station', 'system')");
    }
};
