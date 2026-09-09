<?php

namespace App\Services\Integrations;

use App\Enums\ImportExceptionType;
use App\Enums\PersonType;
use App\Models\ImportBatch;
use App\Models\ImportException;
use App\Models\ParentAccount;
use App\Models\ParentStudentLink;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\User;

/**
 * Imports a CSV roster (students/staff), each row optionally carrying one
 * RFID card UID and one primary guardian. Guardian rows are deduped by email
 * within the same run (so siblings sharing a guardian link to the same
 * ParentAccount instead of creating duplicates) and against any existing
 * tenant ParentAccount with that email. A newly created guardian account
 * gets a generated password; its id is collected via newParentAccountIds()
 * so the controller can offer a "download credentials" CSV afterward.
 *
 * Every query bypasses TenantScope via allTenants() + an explicit tenant_id
 * filter, since this runs from a job with no authenticated-request tenant
 * context — same reasoning as RosterImporter.
 */
class RosterCsvImporter
{
    public const SOURCE_SYSTEM = 'csv_upload';

    /** @var array<string, ParentAccount> email (lowercased) => account, this run only */
    protected array $guardianCache = [];

    /** @var list<string> */
    protected array $newParentAccountIds = [];

    public function __construct(
        protected ImportBatch $batch,
        protected bool $commit,
        protected ?User $actor = null,
    ) {}

    /**
     * @param  iterable<int, array<string, mixed>>  $rows  one row per student/staff record
     */
    public function run(iterable $rows): array
    {
        $counters = static::emptyCounters();
        $tenantId = $this->batch->tenant_id;

        foreach ($rows as $rowNumber => $row) {
            $counters['source']++;
            $externalId = $this->stringOrNull($row['external_id'] ?? null);
            $sourceRecordId = $externalId ?? ('row-'.($rowNumber + 2));

            $errors = $this->validateRow($row);
            if ($errors !== []) {
                $counters['rejected']++;
                $this->recordException('person', $sourceRecordId, ImportExceptionType::ValidationError, [
                    'errors' => $errors,
                    'data' => $row,
                ]);

                continue;
            }

            $personType = PersonType::from(strtolower(trim((string) $row['person_type'])));

            $existing = $externalId !== null
                ? Person::allTenants()
                    ->where('tenant_id', $tenantId)
                    ->where('source_system', static::SOURCE_SYSTEM)
                    ->where('source_record_id', $externalId)
                    ->first()
                : null;

            if ($existing !== null) {
                $counters['skipped_known']++;
                $person = $existing;
            } elseif (! $this->commit) {
                $counters['imported']++;
                $person = null;
            } else {
                $person = Person::registerForTenant($tenantId, [
                    'external_id' => $externalId,
                    'person_type' => $personType,
                    'first_name' => trim((string) $row['first_name']),
                    'middle_name' => $this->stringOrNull($row['middle_name'] ?? null),
                    'last_name' => trim((string) $row['last_name']),
                    'display_name' => $this->stringOrNull($row['display_name'] ?? null),
                    'grade_level' => $this->stringOrNull($row['grade_level'] ?? null),
                    'section' => $this->stringOrNull($row['section'] ?? null),
                    'photo_url' => $this->stringOrNull($row['photo_url'] ?? null),
                    'source_system' => static::SOURCE_SYSTEM,
                    'source_record_id' => $externalId,
                ], $this->actor);
                $counters['imported']++;

                if ($this->isInactiveStatus($row['status'] ?? null)) {
                    Person::deactivate($person, $this->actor);
                }
            }

            if ($person !== null) {
                $this->assignCardIfMissing($person, $row, $sourceRecordId, $counters);
                $this->linkGuardianIfPresent($person, $row, $tenantId, $counters);
            }
        }

        return $counters;
    }

    /** @return list<string> */
    protected function validateRow(array $row): array
    {
        $errors = [];

        $personType = strtolower(trim((string) ($row['person_type'] ?? '')));
        if (! in_array($personType, ['student', 'staff'], true)) {
            $errors[] = 'person_type must be "student" or "staff".';
        }

        if (trim((string) ($row['first_name'] ?? '')) === '') {
            $errors[] = 'first_name is required.';
        }
        if (trim((string) ($row['last_name'] ?? '')) === '') {
            $errors[] = 'last_name is required.';
        }

        $photoUrl = $this->stringOrNull($row['photo_url'] ?? null);
        if ($photoUrl !== null && filter_var($photoUrl, FILTER_VALIDATE_URL) === false) {
            $errors[] = 'photo_url must be a valid URL.';
        }

        $guardianEmail = $this->stringOrNull($row['guardian_email'] ?? null);
        $guardianName = $this->stringOrNull($row['guardian_name'] ?? null);
        $guardianPhone = $this->stringOrNull($row['guardian_phone'] ?? null);
        if (($guardianName !== null || $guardianPhone !== null) && $guardianEmail === null) {
            $errors[] = 'guardian_email is required whenever guardian_name or guardian_phone is provided.';
        }
        if ($guardianEmail !== null && filter_var($guardianEmail, FILTER_VALIDATE_EMAIL) === false) {
            $errors[] = 'guardian_email must be a valid email address.';
        }

        return $errors;
    }

    protected function assignCardIfMissing(Person $person, array $row, string $sourceRecordId, array &$counters): void
    {
        if (! $this->commit) {
            return;
        }

        $cardUid = $this->stringOrNull($row['rfid_card_uid'] ?? null);
        if ($cardUid === null) {
            return;
        }

        $normalized = RfidCard::normalizeCardUid($cardUid);
        $existingCard = RfidCard::allTenants()
            ->where('tenant_id', $person->tenant_id)
            ->where('card_uid', $normalized)
            ->first();

        if ($existingCard !== null) {
            // One-way-once rule, same as RosterImporter: never move a card
            // already assigned to someone else.
            if ($existingCard->person_id !== $person->id) {
                $counters['manual_review']++;
                $this->recordException('rfid_card', $sourceRecordId, ImportExceptionType::AmbiguousDuplicate, [
                    'card_uid' => $normalized,
                    'already_assigned_to_person_id' => $existingCard->person_id,
                ]);
            }

            return;
        }

        RfidCard::assign($person->tenant_id, $person->id, $cardUid, $this->actor);
    }

    protected function linkGuardianIfPresent(Person $person, array $row, string $tenantId, array &$counters): void
    {
        if (! $this->commit) {
            return;
        }

        $email = $this->stringOrNull($row['guardian_email'] ?? null);
        if ($email === null) {
            return;
        }

        $email = strtolower($email);
        $account = $this->resolveGuardianAccount($tenantId, $email, $row, $counters);

        $alreadyLinked = ParentStudentLink::query()
            ->where('parent_account_id', $account->id)
            ->where('person_id', $person->id)
            ->exists();

        if (! $alreadyLinked) {
            $account->studentLinks()->create([
                'person_id' => $person->id,
                'approved_by' => $this->actor?->id,
            ]);
            $counters['guardians_linked']++;
        }
    }

    protected function resolveGuardianAccount(string $tenantId, string $email, array $row, array &$counters): ParentAccount
    {
        if (isset($this->guardianCache[$email])) {
            return $this->guardianCache[$email];
        }

        $account = ParentAccount::allTenants()
            ->where('tenant_id', $tenantId)
            ->where('email', $email)
            ->first();

        if ($account === null) {
            $phone = $this->stringOrNull($row['guardian_phone'] ?? null);

            $result = ParentAccount::provision($tenantId, [
                'name' => $this->stringOrNull($row['guardian_name'] ?? null) ?? $email,
                'email' => $email,
                'phone_number' => $phone,
                // notify_sms defaults to true only when a phone number was
                // actually supplied — no point opting a channel in that has
                // nothing to send to.
                'notification_preferences' => ['notify_in' => true, 'notify_out' => true, 'notify_sms' => $phone !== null],
            ], $this->actor);

            $account = $result['account'];
            $this->newParentAccountIds[] = $account->id;
            $counters['guardians_created']++;
        }

        return $this->guardianCache[$email] = $account;
    }

    protected function recordException(string $entityType, ?string $sourceRecordId, ImportExceptionType $type, array $payload): void
    {
        if (! $this->commit) {
            return;
        }

        ImportException::record($this->batch->tenant_id, $this->batch->id, $entityType, $sourceRecordId, $type, $payload);
    }

    protected function isInactiveStatus(mixed $status): bool
    {
        return in_array(strtolower(trim((string) $status)), ['inactive', 'disabled', 'false', '0'], true);
    }

    protected function stringOrNull(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));

        return $value === '' ? null : $value;
    }

    /** @return list<string> parent_account IDs newly created by this run */
    public function newParentAccountIds(): array
    {
        return $this->newParentAccountIds;
    }

    public static function emptyCounters(): array
    {
        return [
            'source' => 0, 'imported' => 0, 'skipped_known' => 0, 'rejected' => 0,
            'manual_review' => 0, 'guardians_created' => 0, 'guardians_linked' => 0,
        ];
    }
}
