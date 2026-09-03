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
        Schema::create('tap_events', function (Blueprint $table) {
            // Kiosk-generated UUID — the primary idempotency key for the
            // device batch-upload path; resubmitting an existing id is a
            // successful no-op rather than a duplicate insert.
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('station_id');
            $table->uuid('person_id')->nullable();
            $table->string('card_uid', 100);
            $table->enum('person_type', ['student', 'staff'])->nullable();
            $table->enum('event_type', ['IN', 'OUT']);
            $table->timestamp('occurred_at', 3);
            $table->smallInteger('occurred_offset_minutes');
            $table->timestamp('received_at', 3);
            $table->date('attendance_date_local');
            $table->string('source_system', 50)->default('adaptive_station');
            $table->string('source_record_id', 100)->nullable();
            $table->uuid('import_batch_id')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('station_id')->references('id')->on('stations');
            $table->foreign('person_id')->references('id')->on('people');
            $table->unique(['tenant_id', 'source_system', 'source_record_id'], 'uq_tap_events_import_source');
            $table->index(['tenant_id', 'occurred_at'], 'ix_tap_events_tenant_occurred');
            $table->index(['tenant_id', 'person_id', 'attendance_date_local'], 'ix_tap_events_tenant_person_date');
            $table->index(['tenant_id', 'card_uid', 'occurred_at'], 'ix_tap_events_tenant_card_occurred');
            $table->index(['station_id', 'occurred_at'], 'ix_tap_events_station_occurred');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tap_events');
    }
};
