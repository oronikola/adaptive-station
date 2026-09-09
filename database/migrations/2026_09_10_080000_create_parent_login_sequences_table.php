<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Backing store for ParentAccount::generateLoginId()'s per-tenant,
     * per-year sequence — a dedicated counter row (rather than counting
     * existing parent_accounts rows) so the number never collides even if
     * an account is later deleted, and so the counter can be lockForUpdate()'d
     * independently of the accounts table itself.
     */
    public function up(): void
    {
        Schema::connection('mysql')->create('parent_login_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')->constrained('tenants');
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('next_number')->default(1);
            $table->timestamps();

            $table->unique(['tenant_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('parent_login_sequences');
    }
};
