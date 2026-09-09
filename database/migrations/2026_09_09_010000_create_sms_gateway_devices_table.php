<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Deliberately no tenant_id — a physical phone in the SMS gateway
        // fleet serves every tenant's pending outbox rows, not one school.
        // That's the whole fix for the legacy essentiel.ph bottleneck (see
        // IP-007): static per-school device assignment starved busy schools
        // while other devices sat idle.
        Schema::connection('mysql')->create('sms_gateway_devices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('label', 100);
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_seen_at', 3)->nullable();
            $table->unsignedInteger('sent_today')->default(0);
            $table->unsignedInteger('failed_today')->default(0);
            $table->date('stats_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('sms_gateway_devices');
    }
};
