<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores a recoverable (app-key-encrypted, not hashed) copy of every
 * provisioned tenant admin/operator's password, at the platform operator's
 * explicit request — so the Admin Users panel can reveal it anytime,
 * replacing the earlier shown-once-then-gone flash. This is a deliberate
 * security tradeoff: unlike the one-way `password` hash, this column can be
 * decrypted by anyone holding APP_KEY plus database access. See
 * User::provisionForTenant() and the three password-change controllers that
 * keep this column in sync with the real password.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'password_plaintext')) {
                $table->text('password_plaintext')->nullable()->after('password');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'password_plaintext')) {
                $table->dropColumn('password_plaintext');
            }
        });
    }
};
