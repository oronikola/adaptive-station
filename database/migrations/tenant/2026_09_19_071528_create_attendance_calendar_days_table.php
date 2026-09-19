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
        Schema::connection($this->getConnection())->create('attendance_calendar_days', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->date('date');
            $table->boolean('is_school_day')->default(true);
            $table->string('label', 150)->nullable();
            $table->timestamps(3);

            $table->unique(['tenant_id', 'date']);
            $table->index(['tenant_id', 'date', 'is_school_day']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection($this->getConnection())->dropIfExists('attendance_calendar_days');
    }
};
