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
        Schema::create('station_credentials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('station_id');
            $table->char('token_hash', 64);
            $table->string('label', 100)->nullable();
            $table->timestamp('expires_at', 3)->nullable();
            $table->timestamp('last_used_at', 3)->nullable();
            $table->timestamp('revoked_at', 3)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            $table->foreign('station_id')->references('id')->on('stations');
            $table->unique('token_hash', 'uq_station_credentials_token_hash');
            $table->index(['station_id', 'revoked_at', 'expires_at'], 'ix_station_credentials_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('station_credentials');
    }
};
