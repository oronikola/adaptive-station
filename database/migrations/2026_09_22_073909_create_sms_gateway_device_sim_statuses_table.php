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
        Schema::connection('mysql')->create('sms_gateway_device_sim_statuses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('device_id')->constrained('sms_gateway_devices')->cascadeOnDelete();
            $table->unsignedTinyInteger('sim_slot');
            $table->string('carrier', 30)->default('smart');
            $table->enum('status', ['has_load', 'no_load', 'unknown', 'paused'])->default('unknown');
            $table->unsignedInteger('balance_centavos')->nullable();
            $table->enum('source', ['manual', 'ussd'])->default('manual');
            $table->timestamp('checked_at')->nullable();
            $table->string('last_error', 255)->nullable();
            $table->timestamps();

            $table->unique(['device_id', 'sim_slot'], 'uq_sms_gateway_device_sim_statuses_device_slot');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('sms_gateway_device_sim_statuses');
    }
};
