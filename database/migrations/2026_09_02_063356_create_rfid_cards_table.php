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
        Schema::create('rfid_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('person_id');
            $table->string('card_uid', 100);
            $table->boolean('is_active')->default(true);
            $table->timestamp('assigned_at', 3);
            $table->timestamp('deactivated_at', 3)->nullable();
            $table->string('source_system', 50)->nullable();
            $table->string('source_record_id', 100)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->timestamp('updated_at', 3)->useCurrent()->useCurrentOnUpdate();

            $table->foreign('tenant_id')->references('id')->on('tenants');
            $table->foreign('person_id')->references('id')->on('people');
            $table->unique(['tenant_id', 'card_uid'], 'uq_rfid_cards_tenant_uid');
            $table->unique(['tenant_id', 'source_system', 'source_record_id'], 'uq_rfid_cards_import_source');
            $table->index(['tenant_id', 'person_id', 'is_active'], 'ix_rfid_cards_tenant_person');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rfid_cards');
    }
};
