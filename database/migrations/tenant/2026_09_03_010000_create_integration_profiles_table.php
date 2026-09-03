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
        Schema::connection($this->getConnection())->create('integration_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 150);
            $table->string('driver', 50);
            $table->enum('direction', ['import_only', 'export_only', 'bidirectional']);
            $table->enum('status', ['active', 'disabled', 'error'])->default('disabled');
            $table->text('config_encrypted');
            $table->timestamp('last_successful_run_at', 3)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->timestamp('updated_at', 3)->useCurrent()->useCurrentOnUpdate();

            $table->index(['tenant_id', 'status'], 'ix_integration_profiles_tenant_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('integration_profiles');
    }
};
