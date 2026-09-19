<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tenant';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection($this->getConnection())->create('attendance_exceptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('person_id');
            $table->uuid('tap_event_id')->nullable();
            $table->date('attendance_date');
            $table->enum('type', ['excused_absence', 'manual_present', 'missing_out', 'late_review']);
            $table->enum('status', ['open', 'resolved'])->default('open');
            $table->text('reason');
            $table->uuid('resolved_by_user_id')->nullable();
            $table->timestamp('resolved_at', 3)->nullable();
            $table->timestamps(3);

            $table->foreign('person_id')->references('id')->on('people');
            $table->index(['tenant_id', 'attendance_date', 'status']);
            $table->index(['tenant_id', 'person_id', 'attendance_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('attendance_exceptions');
    }
};
