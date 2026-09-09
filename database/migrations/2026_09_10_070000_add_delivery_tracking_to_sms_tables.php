<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // status is a plain string(20) column, not a native MySQL ENUM, so
        // adding the 'delivered' value (App\Enums\SmsOutboxStatus) needs no
        // schema change here — only delivered_at is new.
        Schema::connection('mysql')->table('sms_outbox', function (Blueprint $table) {
            $table->timestamp('delivered_at', 3)->nullable()->after('sent_at');
        });

        Schema::connection('mysql')->table('sms_gateway_devices', function (Blueprint $table) {
            $table->unsignedInteger('delivered_today')->default(0)->after('sent_today');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('sms_outbox', function (Blueprint $table) {
            $table->dropColumn('delivered_at');
        });

        Schema::connection('mysql')->table('sms_gateway_devices', function (Blueprint $table) {
            $table->dropColumn('delivered_today');
        });
    }
};
