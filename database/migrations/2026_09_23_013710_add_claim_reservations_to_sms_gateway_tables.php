<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection('mysql')->table('sms_gateway_device_sim_stats', function (Blueprint $table) {
            $table->unsignedInteger('reserved_today')->default(0)->after('sent_today');
        });

        Schema::connection('mysql')->table('sms_outbox', function (Blueprint $table) {
            $table->unsignedTinyInteger('claimed_sim_slot')->nullable()->after('claimed_by_device_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->table('sms_outbox', function (Blueprint $table) {
            $table->dropColumn('claimed_sim_slot');
        });

        Schema::connection('mysql')->table('sms_gateway_device_sim_stats', function (Blueprint $table) {
            $table->dropColumn('reserved_today');
        });
    }
};
