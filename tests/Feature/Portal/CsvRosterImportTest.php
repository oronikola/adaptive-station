<?php

namespace Tests\Feature\Portal;

use App\Enums\ImportBatchStatus;
use App\Models\ImportBatch;
use App\Models\ImportException;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CsvRosterImportTest extends TestCase
{
    use RefreshDatabase;

    protected function csvFile(string $contents, string $name = 'roster.csv'): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($path, $contents);

        return new UploadedFile($path, $name, 'text/csv', null, true);
    }

    public function test_commit_creates_people_cards_and_a_shared_guardian_for_siblings(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $csv = "external_id,person_type,first_name,last_name,grade_level,section,rfid_card_uid,guardian_name,guardian_email,guardian_phone\n"
            ."S-1,student,Alex,Santos,5,A,card-aaa,Maria Santos,maria@example.test,+639170000001\n"
            ."S-2,student,Mia,Santos,3,B,card-bbb,Maria Santos,MARIA@example.test,+639170000001\n";

        $response = $this->actingAs($admin)->post(route('portal.imports.csv.store'), [
            'file' => $this->csvFile($csv),
            'commit' => true,
        ]);

        $batch = ImportBatch::allTenants()->where('tenant_id', $tenant->id)->sole();
        $response->assertRedirect(route('portal.imports.show', $batch));

        $this->assertSame(ImportBatchStatus::Completed, $batch->status);
        $this->assertSame(2, $batch->summary['imported']);
        $this->assertSame(1, $batch->summary['guardians_created']);
        $this->assertSame(2, $batch->summary['guardians_linked']);

        $this->assertSame(2, Person::allTenants()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(2, RfidCard::allTenants()->where('tenant_id', $tenant->id)->count());

        $guardian = ParentAccount::query()->sole();
        $this->assertSame('maria@example.test', $guardian->email);
        $this->assertSame('+639170000001', $guardian->phone_number);
        $this->assertSame(2, $guardian->studentLinks()->count());
        $this->assertNotNull($guardian->password_plaintext);
        $this->assertTrue(Hash::check($guardian->password_plaintext, $guardian->password));
        $this->assertTrue($guardian->notification_preferences['notify_sms']);

        $this->assertSame([$guardian->id], $batch->summary['new_parent_account_ids']);
    }

    public function test_preview_does_not_write_anything(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $csv = "external_id,person_type,first_name,last_name\nS-1,student,Alex,Santos\n";

        $this->actingAs($admin)->post(route('portal.imports.csv.store'), [
            'file' => $this->csvFile($csv),
            'commit' => false,
        ])->assertRedirect();

        $batch = ImportBatch::allTenants()->where('tenant_id', $tenant->id)->sole();
        $this->assertSame(ImportBatchStatus::Validating, $batch->status);
        $this->assertSame(1, $batch->summary['imported']);
        $this->assertDatabaseCount('people', 0, 'tenant');
        $this->assertDatabaseCount('parent_accounts', 0);
    }

    public function test_invalid_rows_are_rejected_and_recorded_as_import_exceptions(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $csv = "external_id,person_type,first_name,last_name,guardian_name,guardian_phone\n"
            ."S-1,student,,Santos,,\n" // missing first_name
            ."S-2,student,Ben,Cruz,Rita Cruz,+639170000002\n"; // guardian_name/phone without email

        $this->actingAs($admin)->post(route('portal.imports.csv.store'), [
            'file' => $this->csvFile($csv),
            'commit' => true,
        ])->assertRedirect();

        $batch = ImportBatch::allTenants()->where('tenant_id', $tenant->id)->sole();
        $this->assertSame(2, $batch->summary['rejected']);
        $this->assertSame(0, $batch->summary['imported']);
        $this->assertSame(2, ImportException::allTenants()->where('import_batch_id', $batch->id)->count());
        $this->assertSame(ImportBatchStatus::Completed, $batch->status);
    }

    public function test_re_running_with_the_same_external_ids_skips_known_people_and_reuses_the_guardian(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $csv = "external_id,person_type,first_name,last_name,guardian_name,guardian_email\n"
            ."S-1,student,Alex,Santos,Maria Santos,maria@example.test\n";

        $firstResponse = $this->actingAs($admin)->post(route('portal.imports.csv.store'), ['file' => $this->csvFile($csv), 'commit' => true]);
        $secondResponse = $this->actingAs($admin)->post(route('portal.imports.csv.store'), ['file' => $this->csvFile($csv), 'commit' => true]);

        $this->assertSame(1, Person::allTenants()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(1, ParentAccount::query()->count());

        $firstBatchId = str($firstResponse->headers->get('Location'))->afterLast('/')->toString();
        $lastBatchId = str($secondResponse->headers->get('Location'))->afterLast('/')->toString();
        $this->assertNotSame($firstBatchId, $lastBatchId);
        $lastBatch = ImportBatch::allTenants()->findOrFail($lastBatchId);
        $this->assertSame(1, $lastBatch->summary['skipped_known']);
        $this->assertSame(0, $lastBatch->summary['guardians_created']);
        $this->assertSame([], $lastBatch->summary['new_parent_account_ids']);
    }

    public function test_credentials_csv_is_downloadable_only_when_guardians_were_created(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $csv = "external_id,person_type,first_name,last_name,guardian_name,guardian_email\n"
            ."S-1,student,Alex,Santos,Maria Santos,maria@example.test\n";

        $this->actingAs($admin)->post(route('portal.imports.csv.store'), ['file' => $this->csvFile($csv), 'commit' => true]);
        $batch = ImportBatch::allTenants()->where('tenant_id', $tenant->id)->sole();

        $response = $this->actingAs($admin)->get(route('portal.imports.credentials', $batch));
        $response->assertOk();
        $content = $response->streamedContent();
        $this->assertStringContainsString('maria@example.test', $content);

        $guardian = ParentAccount::query()->sole();
        $this->assertStringContainsString($guardian->password_plaintext, $content);
    }

    public function test_credentials_csv_404s_when_no_guardians_were_created(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $csv = "external_id,person_type,first_name,last_name\nS-1,student,Alex,Santos\n";
        $this->actingAs($admin)->post(route('portal.imports.csv.store'), ['file' => $this->csvFile($csv), 'commit' => true]);
        $batch = ImportBatch::allTenants()->where('tenant_id', $tenant->id)->sole();

        $this->actingAs($admin)->get(route('portal.imports.credentials', $batch))->assertNotFound();
    }

    public function test_a_card_already_assigned_to_someone_else_is_flagged_for_manual_review_not_moved(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $existingPerson = Person::factory()->create(['tenant_id' => $tenant->id]);
        RfidCard::assign($tenant->id, $existingPerson->id, 'shared-card');

        $csv = "external_id,person_type,first_name,last_name,rfid_card_uid\nS-1,student,Alex,Santos,shared-card\n";
        $this->actingAs($admin)->post(route('portal.imports.csv.store'), ['file' => $this->csvFile($csv), 'commit' => true]);

        $batch = ImportBatch::allTenants()->where('tenant_id', $tenant->id)->sole();
        $this->assertSame(1, $batch->summary['manual_review']);
        $this->assertSame(1, RfidCard::allTenants()->where('tenant_id', $tenant->id)->where('card_uid', 'SHARED-CARD')->count());
        $this->assertSame(1, ImportException::allTenants()->where('import_batch_id', $batch->id)->where('entity_type', 'rfid_card')->count());
    }

    public function test_tenant_operator_cannot_upload_a_csv_import(): void
    {
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();

        $this->actingAs($operator)->post(route('portal.imports.csv.store'), [
            'file' => $this->csvFile("person_type,first_name,last_name\nstudent,Alex,Santos\n"),
            'commit' => true,
        ])->assertForbidden();
    }

    public function test_missing_required_columns_fails_the_batch(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->post(route('portal.imports.csv.store'), [
            'file' => $this->csvFile("name\nAlex Santos\n"),
            'commit' => true,
        ])->assertRedirect();

        $batch = ImportBatch::allTenants()->where('tenant_id', $tenant->id)->sole();
        $this->assertSame(ImportBatchStatus::Failed, $batch->status);
        $this->assertStringContainsString('Missing required column', $batch->summary['failure_reason']);
    }
}
