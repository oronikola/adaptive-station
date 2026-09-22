<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tenant';

    public function up(): void
    {
        Schema::connection($this->getConnection())->create('kiosk_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('station_id');
            $table->enum('type', ['image', 'video']);
            // The R2 object key, not a full URL — the public URL is derived
            // from config('filesystems.disks.r2.url') at read time, so
            // rotating the bucket's public domain never requires a data
            // migration.
            $table->string('disk_path', 255);
            $table->unsignedSmallInteger('position')->default(0);
            // How long this slide is shown in the kiosk's idle carousel —
            // applies to both images and videos (a looping video keeps
            // replaying if its natural length is shorter than this). Null
            // falls back to the kiosk's own default.
            $table->unsignedSmallInteger('duration_seconds')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps(3);

            $table->foreign('station_id')->references('id')->on('stations')->cascadeOnDelete();
            $table->index(['tenant_id', 'station_id', 'is_active', 'position']);
        });
    }

    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('kiosk_media');
    }
};
