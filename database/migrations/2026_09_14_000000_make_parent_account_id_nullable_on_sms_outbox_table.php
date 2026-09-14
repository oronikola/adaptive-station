<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * A tap pushed through the essentiel_api driver (see
     * PushTapEventToEssentielJob) sends its SMS using the guardian number
     * essentiel's response returned, not a local ParentAccount — there may
     * be no local guardian record at all for that student, so this column
     * can no longer be required the way it was when only the local
     * ParentAccount-driven notification path existed. No doctrine/dbal in
     * this app, so a raw ALTER rather than Schema::table()->change().
     */
    public function up(): void
    {
        DB::connection('mysql')->statement(
            'ALTER TABLE sms_outbox MODIFY parent_account_id CHAR(36) NULL'
        );
    }

    public function down(): void
    {
        DB::connection('mysql')->statement(
            'ALTER TABLE sms_outbox MODIFY parent_account_id CHAR(36) NOT NULL'
        );
    }
};
