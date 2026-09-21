<?php

namespace Tests\Feature\Console;

use App\Models\AuditLog;
use App\Models\ParentAccount;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Covers the one-time correction for parent.credentials_self_service_*
 * audit_logs rows recorded before ParentCredentialLookupController started
 * snapshotting parent_name/masked_phone — see
 * BackfillCredentialRequestMetadataCommand's docblock.
 */
class BackfillCredentialRequestMetadataCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_backfills_metadata_from_the_still_existing_parent_account(): void
    {
        $tenant = Tenant::factory()->create();
        $account = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'TEST GUARDIAN',
            'phone_number' => '+639101603448',
        ]);
        $log = AuditLog::record('parent.credentials_self_service_queued', null, $tenant->id, 'parent_account', $account->id);
        $this->assertNull($log->metadata);

        $this->artisan('credential-requests:backfill-metadata')->assertSuccessful();

        $log->refresh();
        $this->assertSame('TEST GUARDIAN', $log->metadata['parent_name']);
        $this->assertSame('+63••••3448', $log->metadata['masked_phone']);
    }

    public function test_dry_run_reports_without_writing_any_changes(): void
    {
        $tenant = Tenant::factory()->create();
        $account = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $log = AuditLog::record('parent.credentials_self_service_queued', null, $tenant->id, 'parent_account', $account->id);

        $this->artisan('credential-requests:backfill-metadata', ['--dry-run' => true])->assertSuccessful();

        $this->assertNull($log->refresh()->metadata);
    }

    public function test_a_row_whose_account_no_longer_exists_is_left_alone(): void
    {
        $tenant = Tenant::factory()->create();
        $log = AuditLog::record('parent.credentials_self_service_queued', null, $tenant->id, 'parent_account', (string) Str::uuid());

        $this->artisan('credential-requests:backfill-metadata')->assertSuccessful();

        $this->assertNull($log->refresh()->metadata);
    }

    public function test_a_row_that_already_has_metadata_is_left_alone(): void
    {
        $tenant = Tenant::factory()->create();
        $account = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Changed Since']);
        $log = AuditLog::record('parent.credentials_self_service_queued', null, $tenant->id, 'parent_account', $account->id, [
            'parent_name' => 'Original Name',
            'masked_phone' => '+63••••0000',
        ]);

        $this->artisan('credential-requests:backfill-metadata')->assertSuccessful();

        $this->assertSame('Original Name', $log->refresh()->metadata['parent_name']);
    }
}
