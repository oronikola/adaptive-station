<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('parent_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants');
            $table->string('name', 150);
            $table->string('email');
            $table->string('password');
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
            $table->unique(['tenant_id', 'email']);
        });

        Schema::connection('mysql')->create('parent_student_links', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('parent_account_id')->constrained('parent_accounts')->cascadeOnDelete();
            // Students live in separate physical school databases. Validate the
            // school boundary in the request; no cross-database FK is possible.
            $table->uuid('person_id');
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['parent_account_id', 'person_id']);
            $table->index('person_id');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('parent_student_links');
        Schema::connection('mysql')->dropIfExists('parent_accounts');
    }
};
