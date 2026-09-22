<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tenant';

    public function up(): void
    {
        Schema::connection($this->getConnection())->table('kiosk_media', function (Blueprint $table) {
            // The name the uploader's own device gave the file — shown next
            // to each slide so an admin can spot an accidental duplicate
            // upload. Nullable: existing rows uploaded before this column
            // existed have no way to recover it.
            $table->string('original_filename', 255)->nullable()->after('disk_path');
        });
    }

    public function down(): void
    {
        Schema::connection($this->getConnection())->table('kiosk_media', function (Blueprint $table) {
            $table->dropColumn('original_filename');
        });
    }
};
