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
        Schema::create('device_sync_cursors', function (Blueprint $table) {
            $table->uuid('station_id')->primary();
            $table->unsignedBigInteger('master_data_version')->default(0);
            $table->timestamp('last_pull_at', 3)->nullable();
            $table->timestamp('last_upload_at', 3)->nullable();
            $table->timestamp('last_successful_sync_at', 3)->nullable();
            $table->timestamp('updated_at', 3)->useCurrent()->useCurrentOnUpdate();

            $table->foreign('station_id')->references('id')->on('stations');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('device_sync_cursors');
    }
};
