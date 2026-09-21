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
        Schema::connection('mysql')->table('sms_outbox', function (Blueprint $table) {
            // Nullable so older gateway builds can keep reporting their
            // existing error text while the fleet update rolls out.
            $table->string('failure_category', 50)->nullable()->after('last_error');
            $table->integer('android_result_code')->nullable()->after('failure_category');
            $table->integer('carrier_error_code')->nullable()->after('android_result_code');
            $table->string('gateway_app_version', 50)->nullable()->after('carrier_error_code');
            $table->index(['status', 'failure_category'], 'ix_sms_outbox_failure_summary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->table('sms_outbox', function (Blueprint $table) {
            $table->dropIndex('ix_sms_outbox_failure_summary');
            $table->dropColumn(['failure_category', 'android_result_code', 'carrier_error_code', 'gateway_app_version']);
        });
    }
};
