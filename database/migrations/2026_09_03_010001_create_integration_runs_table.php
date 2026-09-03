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
        Schema::create('integration_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('integration_profile_id');
            $table->enum('direction', ['import', 'export']);
            $table->enum('status', ['queued', 'running', 'succeeded', 'failed', 'partial']);
            $table->timestamp('started_at', 3)->nullable();
            $table->timestamp('finished_at', 3)->nullable();
            $table->json('summary')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('integration_profile_id')->references('id')->on('integration_profiles');
            $table->index(['integration_profile_id', 'created_at'], 'ix_integration_runs_profile_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('integration_runs');
    }
};
