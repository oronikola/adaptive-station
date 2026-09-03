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
        Schema::create('import_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            // Nullable + not part of the original DDL: every import in this
            // design originates from a profile, so batches need a way back to
            // the connector that will process them.
            $table->uuid('integration_profile_id')->nullable();
            $table->string('source_system', 50);
            $table->string('source_description', 255)->nullable();
            $table->enum('status', ['draft', 'validating', 'importing', 'completed', 'completed_with_exceptions', 'failed']);
            $table->timestamp('started_at', 3)->nullable();
            $table->timestamp('finished_at', 3)->nullable();
            $table->json('summary')->nullable();
            $table->uuid('created_by_user_id');
            $table->timestamp('created_at', 3)->useCurrent();

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('integration_profile_id')->references('id')->on('integration_profiles');
            $table->foreign('created_by_user_id')->references('id')->on('users');
            $table->index(['tenant_id', 'created_at'], 'ix_import_batches_tenant_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_batches');
    }
};
