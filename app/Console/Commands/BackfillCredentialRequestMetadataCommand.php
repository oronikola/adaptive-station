<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\ParentAccount;
use Illuminate\Console\Command;

/**
 * One-time correction tool for parent.credentials_self_service_* audit_logs
 * rows recorded before ParentCredentialLookupController::logOutcome() started
 * snapshotting parent_name/masked_phone into metadata — those older rows
 * show as "Unknown" / "No phone on file" on
 * Platform\CredentialRequestLogController's screen, not because anything is
 * broken, but because that data was never captured at the time. Backfills it
 * from the still-existing ParentAccount row where possible; a row whose
 * account was since deleted is left as-is (there is nothing left to recover
 * it from).
 *
 * audit_logs and parent_accounts both live on the central `mysql`
 * connection (see each model's docblock), so — unlike
 * tap-events:backfill-direction — this needs no per-tenant database
 * switching.
 */
class BackfillCredentialRequestMetadataCommand extends Command
{
    protected $signature = 'credential-requests:backfill-metadata {--dry-run : Report how many rows would change without writing anything}';

    protected $description = 'Backfill parent_name/masked_phone metadata on historical credential-request audit log rows from their still-existing ParentAccount';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $logs = AuditLog::allTenants()
            ->where('action', 'like', 'parent.credentials_self_service_%')
            ->where('entity_type', 'parent_account')
            ->whereNull('metadata')
            ->get();

        $backfilled = 0;
        $orphaned = 0;

        foreach ($logs as $log) {
            $account = ParentAccount::allTenants()->find($log->entity_id);

            if ($account === null) {
                $orphaned++;

                continue;
            }

            $backfilled++;

            if (! $dryRun) {
                $log->forceFill([
                    'metadata' => [
                        'parent_name' => $account->name,
                        'masked_phone' => ParentAccount::maskedPhone($account->phone_number),
                    ],
                ])->save();
            }
        }

        $this->info(($dryRun ? '[dry run] ' : '').
            "{$backfilled} row(s) ".($dryRun ? 'would be backfilled' : 'backfilled').
            ($orphaned > 0 ? ", {$orphaned} row(s) skipped (parent account no longer exists)." : '.'));

        return self::SUCCESS;
    }
}
