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
        Schema::create('operational_alert_states', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('category', 50);
            $table->foreignUuid('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->boolean('is_active')->default(false);
            $table->json('context')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['category', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('operational_alert_states');
    }
};
