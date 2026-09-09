<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('parent_accounts', function (Blueprint $table) {
            // Recoverable (not just hashed) the same way User::password_plaintext
            // and SmsGatewayDevice::password_plaintext are — a guardian account
            // created in bulk by a CSV import has its generated password handed
            // to nobody yet; the admin must be able to download it afterward.
            $table->text('password_plaintext')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('parent_accounts', function (Blueprint $table) {
            $table->dropColumn('password_plaintext');
        });
    }
};
