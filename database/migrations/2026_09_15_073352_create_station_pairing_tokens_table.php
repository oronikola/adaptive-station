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
        Schema::create('station_pairing_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('station_id');
            $table->char('token_hash', 64);
            $table->uuid('created_by_user_id')->nullable();
            $table->timestamp('last_used_at', 3)->nullable();
            $table->timestamp('revoked_at', 3)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            // No FK to stations — stations lives in the per-tenant database,
            // this table is central; validated at the app layer only.
            $table->foreign('created_by_user_id')->references('id')->on('users');
            $table->unique('token_hash', 'uq_pairing_tokens_hash');
            $table->index(['station_id', 'revoked_at'], 'ix_pairing_tokens_station');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('station_pairing_tokens');
    }
};
