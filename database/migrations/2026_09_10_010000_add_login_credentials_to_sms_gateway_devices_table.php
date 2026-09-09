<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('sms_gateway_devices', function (Blueprint $table) {
            $table->string('username', 100)->nullable()->unique()->after('label');
            $table->string('password')->nullable()->after('username');
            // Recoverable (not just hashed) the same way User::password_plaintext
            // is — a platform admin needs to be able to reveal a device's
            // password again later (it's typed into a phone once at setup,
            // not memorised by a person), same tradeoff as staff accounts.
            $table->text('password_plaintext')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('sms_gateway_devices', function (Blueprint $table) {
            $table->dropColumn(['username', 'password', 'password_plaintext']);
        });
    }
};
