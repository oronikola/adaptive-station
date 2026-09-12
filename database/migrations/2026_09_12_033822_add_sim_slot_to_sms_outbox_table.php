<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Nullable, not backfilled: only known once a device actually
        // reports sending/failing this message (see reportStatus()), and
        // only populated by an app build new enough to report it — an
        // older, not-yet-updated fleet phone simply omits it, so this must
        // degrade gracefully rather than assume it's always present.
        Schema::connection('mysql')->table('sms_outbox', function (Blueprint $table) {
            $table->unsignedTinyInteger('sim_slot')->nullable()->after('claimed_by_device_id');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('sms_outbox', function (Blueprint $table) {
            $table->dropColumn('sim_slot');
        });
    }
};
