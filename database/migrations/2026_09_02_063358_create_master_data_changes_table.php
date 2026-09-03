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
        Schema::create('master_data_changes', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            // Per-tenant monotonic sequence — NOT itself an auto-increment
            // column. See App\Models\MasterDataChange::record() for how the
            // next value is assigned safely under concurrent writers.
            $table->unsignedBigInteger('version');
            $table->enum('entity_type', ['person', 'rfid_card', 'tenant_config', 'station_config']);
            $table->uuid('entity_id');
            $table->enum('operation', ['upsert', 'deactivate', 'delete']);
            $table->json('payload')->nullable();
            $table->timestamp('changed_at', 3);

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->unique(['tenant_id', 'version'], 'uq_master_data_changes_tenant_version');
            $table->index(['tenant_id', 'version'], 'ix_master_data_changes_tenant_version');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_data_changes');
    }
};
