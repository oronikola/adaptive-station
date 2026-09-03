<?php

namespace Tests\Feature\Resilience;

use App\Jobs\RunLegacyExportJob;
use App\Jobs\RunLegacyImportJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use PHPUnit\Framework\TestCase;

/**
 * "Restart while pending" / "duplicate retries" resilience evidence: these
 * jobs declare a bounded retry policy (never retry forever), and the actual
 * safety-under-retry guarantee is proved by LegacyImportJobTest and
 * LegacyExportJobTest re-running the same job twice and asserting zero
 * duplicate rows — this test only proves the retry policy itself exists.
 */
class QueuedImportExportJobRetryPolicyTest extends TestCase
{
    public function test_import_job_is_queueable_with_a_bounded_retry_policy(): void
    {
        $job = new RunLegacyImportJob('batch-id', true, '2026-01-01', '2026-01-31', 'user-id');

        $this->assertInstanceOf(ShouldQueue::class, $job);
        $this->assertSame(3, $job->tries);
        $this->assertSame([60, 300, 900], $job->backoff());
    }

    public function test_export_job_is_queueable_with_a_bounded_retry_policy(): void
    {
        $job = new RunLegacyExportJob('run-id', 'tenant-id', '2026-01-01', '2026-01-31');

        $this->assertInstanceOf(ShouldQueue::class, $job);
        $this->assertSame(3, $job->tries);
        $this->assertSame([60, 300, 900], $job->backoff());
    }
}
