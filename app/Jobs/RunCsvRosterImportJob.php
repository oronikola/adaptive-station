<?php

namespace App\Jobs;

use App\Enums\ImportBatchStatus;
use App\Models\ImportBatch;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Integrations\RosterCsvImporter;
use App\Support\TenantDatabase;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Runs (or previews) one CSV roster import: parses the uploaded file into
 * people + rfid_cards + guardian parent_accounts/parent_student_links, then
 * always deletes the temporary upload. Dispatched synchronously
 * (dispatchSync) by ImportBatchController::storeCsv, same as
 * RunLegacyImportJob — no queue worker required for this MVP.
 */
class RunCsvRosterImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * No retry: unlike the legacy DB import, a bad CSV isn't a transient
     * failure that a retry would fix — the operator needs to see the error
     * and re-upload a corrected file.
     */
    public $tries = 1;

    public function __construct(
        protected string $tenantId,
        protected string $importBatchId,
        protected string $storagePath,
        protected bool $commit,
        protected ?string $actorUserId = null,
    ) {}

    public function handle(): void
    {
        // ImportBatch lives on the per-tenant connection — must point it at
        // this tenant's database before the very first query below.
        TenantDatabase::use(Tenant::findOrFail($this->tenantId));

        $batch = ImportBatch::allTenants()->findOrFail($this->importBatchId);
        $actor = $this->actorUserId !== null ? User::find($this->actorUserId) : null;

        try {
            $rows = $this->parseCsv();
        } catch (RuntimeException $e) {
            $batch->fail($e->getMessage());
            Storage::disk('local')->delete($this->storagePath);

            return;
        }

        $batch->markImporting();

        $importer = new RosterCsvImporter($batch, $this->commit, $actor);
        $summary = $importer->run($rows);
        $summary['new_parent_account_ids'] = $importer->newParentAccountIds();

        if ($this->commit) {
            $batch->complete($summary);
        } else {
            $batch->forceFill(['status' => ImportBatchStatus::Validating, 'summary' => $summary])->save();
        }

        Storage::disk('local')->delete($this->storagePath);
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function parseCsv(): array
    {
        $fullPath = Storage::disk('local')->path($this->storagePath);
        $handle = fopen($fullPath, 'rb');
        if ($handle === false) {
            throw new RuntimeException('Could not read the uploaded file.');
        }

        try {
            $header = fgetcsv($handle);
            if ($header === false) {
                throw new RuntimeException('The uploaded file is empty.');
            }

            $header = array_map(
                fn ($column) => str_replace(' ', '_', strtolower(trim((string) $column))),
                $header,
            );

            $missing = array_diff(['person_type', 'first_name', 'last_name'], $header);
            if ($missing !== []) {
                throw new RuntimeException('Missing required column(s): '.implode(', ', $missing).'.');
            }

            $rows = [];
            while (($line = fgetcsv($handle)) !== false) {
                if ($line === [null]) {
                    continue;
                }

                $row = [];
                foreach ($header as $index => $column) {
                    $row[$column] = $line[$index] ?? null;
                }
                $rows[] = $row;
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }
}
