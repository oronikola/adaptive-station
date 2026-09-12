<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Split from sms_gateway_devices (which only ever tracked per-PHONE
     * totals) rather than adding sim0_/sim1_-prefixed columns there — a
     * phone has exactly 2 SIM slots today, but this shape doesn't hardcode
     * that, and mirrors sms_gateway_device_tokens' own "split, don't
     * cram columns onto the parent" precedent.
     */
    public function up(): void
    {
        Schema::connection('mysql')->create('sms_gateway_device_sim_stats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('device_id')->constrained('sms_gateway_devices')->cascadeOnDelete();
            $table->unsignedTinyInteger('sim_slot');
            $table->unsignedInteger('sent_today')->default(0);
            $table->unsignedInteger('delivered_today')->default(0);
            $table->unsignedInteger('failed_today')->default(0);
            $table->date('stats_date')->nullable();
            $table->timestamps();

            $table->unique(['device_id', 'sim_slot'], 'uq_sms_gateway_device_sim_stats_device_slot');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('sms_gateway_device_sim_stats');
    }
};
