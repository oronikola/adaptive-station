<?php

namespace App\Jobs;

use App\Enums\ImportBatchStatus;
use App\Models\ImportBatch;
use App\Models\IntegrationProfile;
use App\Models\User;
use App\Services\Integrations\LegacyMysqlConnector;
use App\Services\Integrations\RosterImporter;
use App\Services\Integrations\TapHistoryImporter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

/**
 * Runs (or previews) one legacy import: roster (studinfo/teacher -> people +
 * rfid_cards) then attendance history (taphistory -> tap_events) for the
 * given date range. $commit = false performs the identical matching logic
 * read-only (no writes to people/rfid_cards/tap_events/import_exceptions) so
 * the portal can show counts before anything is committed.
 */
class RunLegacyImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Bounded retry, not infinite — a stale/misconfigured legacy connection
     * would otherwise retry forever. Safe to retry at all only because the
     * matching order (stable ID -> insert-or-duplicate -> exception) makes a
     * partially-completed run idempotent: re-running after a crash mid-batch
     * re-derives the same skipped_known/imported split rather than duplicating
     * or losing rows (proved by LegacyImportJobTest's re-run assertions).
     */
    public $tries = 3;

    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function __construct(
        protected string $importBatchId,
        protected bool $commit,
        protected string $dateFrom,
        protected string $dateTo,
        protected ?string $actorUserId = null,
    ) {
    }

    public function handle(): void
    {
        $batch = ImportBatch::allTenants()->findOrFail($this->importBatchId);

        $profile = $batch->integration_profile_id !== null
            ? IntegrationProfile::allTenants()->find($batch->integration_profile_id)
            : null;

        if ($profile === null) {
            $batch->fail('Integration profile not found.');

            return;
        }

        $actor = $this->actorUserId !== null ? User::find($this->actorUserId) : null;
        $batch->markImporting();

        $connector = LegacyMysqlConnector::forProfile($profile);

        $rosterCounters = (new RosterImporter($connector, $batch, $this->commit, $actor))->run();
        $tapCounters = (new TapHistoryImporter($connector, $batch, $this->commit, $actor))->run(
            Carbon::parse($this->dateFrom),
            Carbon::parse($this->dateTo),
        );

        $summary = RosterImporter::sumCounters([$rosterCounters, $tapCounters]);
        $summary['roster'] = $rosterCounters;
        $summary['tap_history'] = $tapCounters;

        if ($this->commit) {
            $batch->complete($summary);
        } else {
            $batch->forceFill(['status' => ImportBatchStatus::Validating, 'summary' => $summary])->save();
        }
    }
}
