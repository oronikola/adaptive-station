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
        Schema::connection($this->getConnection())->create('people', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('external_id', 100)->nullable();
            $table->enum('person_type', ['student', 'staff']);
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('display_name', 255);
            $table->string('grade_level', 100)->nullable();
            $table->string('section', 100)->nullable();
            $table->string('photo_url', 2048)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('deactivated_at', 3)->nullable();
            $table->json('metadata')->nullable();
            $table->string('source_system', 50)->nullable();
            $table->string('source_record_id', 100)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->timestamp('updated_at', 3)->useCurrent()->useCurrentOnUpdate();
            $table->timestamp('deleted_at', 3)->nullable();

            $table->unique(['tenant_id', 'external_id'], 'uq_people_tenant_external_id');
            $table->unique(['tenant_id', 'source_system', 'source_record_id'], 'uq_people_import_source');
            $table->index(['tenant_id', 'is_active', 'person_type'], 'ix_people_tenant_active_type');
            $table->index(['tenant_id', 'last_name', 'first_name'], 'ix_people_tenant_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('people');
    }
};
