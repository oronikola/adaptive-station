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
        Schema::create('import_exceptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('import_batch_id');
            $table->string('entity_type', 50);
            $table->string('source_record_id', 100)->nullable();
            $table->enum('exception_type', ['validation_error', 'ambiguous_duplicate', 'missing_reference', 'unsupported_data']);
            $table->json('payload')->nullable();
            $table->enum('resolution', ['open', 'ignored', 'resolved'])->default('open');
            $table->uuid('resolved_by_user_id')->nullable();
            $table->timestamp('resolved_at', 3)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('import_batch_id')->references('id')->on('import_batches');
            $table->foreign('resolved_by_user_id')->references('id')->on('users');
            $table->index(['import_batch_id', 'resolution'], 'ix_import_exceptions_batch_resolution');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('import_exceptions');
    }
};
