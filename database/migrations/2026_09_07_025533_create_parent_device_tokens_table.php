<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('parent_device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('tenant_id')->constrained('tenants');
            $table->foreignUuid('parent_account_id')->constrained('parent_accounts')->cascadeOnDelete();
            $table->string('fcm_token', 255);
            $table->string('platform', 20)->nullable();
            $table->timestamps();

            $table->unique('fcm_token', 'uq_parent_device_tokens_fcm_token');
            $table->index('parent_account_id');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('parent_device_tokens');
    }
};
