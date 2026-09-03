<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tenant';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection($this->getConnection())->create('device_heartbeats', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->uuid('station_id');
            $table->string('app_version', 50)->nullable();
            $table->unsignedInteger('pending_event_count')->default(0);
            $table->enum('status', ['online', 'degraded', 'offline_reported'])->default('online');
            $table->timestamp('reported_at', 3);

            $table->foreign('station_id')->references('id')->on('stations');
            $table->index(['station_id', 'reported_at'], 'ix_device_heartbeats_station_reported');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('device_heartbeats');
    }
};
