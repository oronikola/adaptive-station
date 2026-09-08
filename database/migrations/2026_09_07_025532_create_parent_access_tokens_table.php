<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('parent_access_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants');
            $table->foreignUuid('parent_account_id')->constrained('parent_accounts')->cascadeOnDelete();
            $table->char('token_hash', 64);
            $table->string('label', 100)->nullable();
            $table->timestamp('expires_at', 3)->nullable();
            $table->timestamp('last_used_at', 3)->nullable();
            $table->timestamp('revoked_at', 3)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            $table->unique('token_hash', 'uq_parent_access_tokens_token_hash');
            $table->index(['parent_account_id', 'revoked_at', 'expires_at'], 'ix_parent_access_tokens_active');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('parent_access_tokens');
    }
};
