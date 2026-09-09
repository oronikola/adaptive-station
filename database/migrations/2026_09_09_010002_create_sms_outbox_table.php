<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Central connection, not the per-tenant `tenant` one: the whole
        // gateway fleet must claim across every tenant's pending messages
        // from one query, without switching DB connections per row. See
        // station_credentials/station_activation_codes for the same
        // central-table-with-a-tenant_id-column pattern.
        Schema::connection('mysql')->create('sms_outbox', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');

            // Plain uuid columns, no FK — person/parent/station/tap_event all
            // live in the per-tenant database; validated at the app layer
            // only, same reasoning as station_credentials' station_id.
            $table->uuid('person_id');
            $table->uuid('parent_account_id');
            $table->uuid('station_id')->nullable();
            $table->uuid('tap_event_id')->nullable();

            $table->string('phone_number', 20);
            $table->string('message', 320);
            $table->string('status', 20)->default('pending');
            $table->unsignedTinyInteger('attempts')->default(0);

            $table->foreignUuid('claimed_by_device_id')->nullable()->constrained('sms_gateway_devices')->nullOnDelete();
            $table->timestamp('claimed_at', 3)->nullable();

            // A very late "tapped in" alert is worse than none — set at
            // insert time (now() + N minutes), not computed later.
            $table->timestamp('expires_at', 3);
            $table->timestamp('sent_at', 3)->nullable();
            $table->string('last_error', 255)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            // Claim scan: oldest pending row first.
            $table->index(['status', 'created_at'], 'ix_sms_outbox_claim');
            // Reclaim-stale-claims job's scan for expired leases.
            $table->index(['status', 'claimed_at'], 'ix_sms_outbox_claimed_lease');
            // Portal backlog-by-tenant metric.
            $table->index(['tenant_id', 'status'], 'ix_sms_outbox_tenant_status');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('sms_outbox');
    }
};
