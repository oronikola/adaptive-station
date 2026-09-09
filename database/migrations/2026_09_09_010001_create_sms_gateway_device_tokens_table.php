<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Split from sms_gateway_devices the same way station_credentials is
        // split from stations — revoking one phone's credential (lost/reset)
        // must never affect the other devices in the fleet or lose that
        // device's history.
        Schema::connection('mysql')->create('sms_gateway_device_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('device_id')->constrained('sms_gateway_devices')->cascadeOnDelete();
            $table->char('token_hash', 64);
            $table->timestamp('last_used_at', 3)->nullable();
            $table->timestamp('revoked_at', 3)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();

            $table->unique('token_hash', 'uq_sms_gateway_device_tokens_token_hash');
            $table->index(['device_id', 'revoked_at'], 'ix_sms_gateway_device_tokens_active');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('sms_gateway_device_tokens');
    }
};
