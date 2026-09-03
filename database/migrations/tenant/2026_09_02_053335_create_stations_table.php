<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Runs against the 'tenant' connection only — this database physically
     * holds one tenant's data, so tenant_id stays only as a defense-in-depth
     * column (still enforced by TenantScope in the app layer); there is no
     * `tenants` table here to foreign-key against.
     */
    protected $connection = 'tenant';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection($this->getConnection())->create('stations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 150);
            $table->string('station_code', 50);
            $table->enum('status', ['pending_activation', 'active', 'disabled', 'retired'])
                ->default('pending_activation');
            $table->string('app_version', 50)->nullable();
            $table->timestamp('last_seen_at', 3)->nullable();
            $table->timestamp('last_scan_at', 3)->nullable();
            $table->unsignedInteger('last_pending_count')->nullable();
            $table->json('configuration')->nullable();
            $table->string('legacy_station_id', 100)->nullable();
            $table->timestamp('created_at', 3)->useCurrent();
            $table->timestamp('updated_at', 3)->useCurrent()->useCurrentOnUpdate();

            $table->unique(['tenant_id', 'station_code'], 'uq_stations_tenant_code');
            $table->index(['tenant_id', 'status'], 'ix_stations_tenant_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('stations');
    }
};
