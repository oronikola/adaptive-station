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
        Schema::connection($this->getConnection())->create('import_exceptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('import_batch_id');
            $table->string('entity_type', 50);
            $table->string('source_record_id', 100)->nullable();
            $table->enum('exception_type', ['validation_error', 'ambiguous_duplicate', 'missing_reference', 'unsupported_data']);
            $table->json('payload')->nullable();
            $table->enum('resolution', ['open', 'ignored', 'resolved'])->default('open');
            // No FK to users — see import_batches.created_by_user_id for the
            // same cross-database reasoning.
            $table->uuid('resolved_by_user_id')->nullable();
            $table->timestamp('resolved_at', 3)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            $table->foreign('import_batch_id')->references('id')->on('import_batches');
            $table->index(['import_batch_id', 'resolution'], 'ix_import_exceptions_batch_resolution');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('import_exceptions');
    }
};
