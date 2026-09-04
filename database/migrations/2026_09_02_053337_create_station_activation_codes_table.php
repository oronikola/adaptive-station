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
        Schema::create('station_activation_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('station_id');
            $table->char('code_hash', 64);
            $table->timestamp('expires_at', 3);
            $table->timestamp('consumed_at', 3)->nullable();
            $table->uuid('created_by_user_id');
            $table->timestamp('created_at', 3)->useCurrent();

            // No FK to stations — stations lives in the per-tenant database,
            // this table is central; validated at the app layer only.
            $table->foreign('created_by_user_id')->references('id')->on('users');
            $table->unique('code_hash', 'uq_activation_codes_hash');
            $table->index(['station_id', 'consumed_at', 'expires_at'], 'ix_activation_codes_station');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('station_activation_codes');
    }
};
