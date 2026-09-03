<?php

namespace App\Services\Integrations;

use App\Enums\ImportExceptionType;
use App\Enums\PersonType;
use App\Models\ImportBatch;
use App\Models\ImportException;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\User;

/**
 * Imports studinfo (students) and teacher (staff) rows into people/rfid_cards.
 * Every query bypasses TenantScope via allTenants() + an explicit tenant_id
 * filter, since this runs from a queued job with no authenticated-request
 * tenant context to resolve the scope from.
 */
class RosterImporter
{
    public const SOURCE_SYSTEM = 'legacy_mysql';

    public function __construct(
        protected LegacyMysqlConnector $connector,
        protected ImportBatch $batch,
        protected bool $commit,
        protected ?User $actor = null,
    ) {
    }

    public function run(): array
    {
        return $this->sumCounters([
            $this->importPersons($this->connector->fetchStudents(), PersonType::Student),
            $this->importPersons($this->connector->fetchTeachers(), PersonType::Staff),
        ]);
    }

    protected function importPersons(iterable $rows, PersonType $personType): array
    {
        $counters = static::emptyCounters();
        $tenantId = $this->batch->tenant_id;

        foreach ($rows as $row) {
            $counters['source']++;

            $hasName = trim((string) ($row['first_name'] ?? '')) !== '' || trim((string) ($row['last_name'] ?? '')) !== '';
            if (! $hasName) {
                $counters['rejected']++;
                $this->recordException($personType->value, $row['source_record_id'] ?? null, ImportExceptionType::ValidationError, $row);

                continue;
            }

            $existing = Person::allTenants()
                ->where('tenant_id', $tenantId)
                ->where('source_system', static::SOURCE_SYSTEM)
                ->where('source_record_id', $row['source_record_id'])
                ->first();

            if ($existing !== null) {
                $counters['skipped_known']++;
                $this->assignCardIfMissing($existing, $row);

                continue;
            }

            if (! $this->commit) {
                $counters['imported']++;

                continue;
            }

            $person = Person::registerForTenant($tenantId, [
                'person_type' => $personType,
                'first_name' => $row['first_name'] ?? '',
                'middle_name' => $row['middle_name'] ?? null,
                'last_name' => $row['last_name'] ?? '',
                'grade_level' => $row['grade_level'] ?? null,
                'section' => $row['section'] ?? null,
                'source_system' => static::SOURCE_SYSTEM,
                'source_record_id' => $row['source_record_id'],
            ], $this->actor);

            $counters['imported']++;
            $this->assignCardIfMissing($person, $row);
        }

        return $counters;
    }

    /**
     * One-way-once rule: a card_uid already assigned to anyone in this tenant
     * is left alone, regardless of which legacy record it now maps to —
     * Adaptive Station owns card assignment once a card has been imported.
     */
    protected function assignCardIfMissing(Person $person, array $row): void
    {
        if (! $this->commit) {
            return;
        }

        $cardUid = $row['card_uid'] ?? null;
        if ($cardUid === null || trim($cardUid) === '') {
            return;
        }

        $normalized = RfidCard::normalizeCardUid($cardUid);
        $exists = RfidCard::allTenants()
            ->where('tenant_id', $person->tenant_id)
            ->where('card_uid', $normalized)
            ->exists();

        if ($exists) {
            return;
        }

        RfidCard::assign($person->tenant_id, $person->id, $cardUid, $this->actor);
    }

    protected function recordException(string $entityType, ?string $sourceRecordId, ImportExceptionType $type, array $payload): void
    {
        if (! $this->commit) {
            return;
        }

        ImportException::record($this->batch->tenant_id, $this->batch->id, $entityType, $sourceRecordId, $type, $payload);
    }

    public static function emptyCounters(): array
    {
        return ['source' => 0, 'imported' => 0, 'skipped_known' => 0, 'rejected' => 0, 'manual_review' => 0];
    }

    public static function sumCounters(array $sets): array
    {
        $total = static::emptyCounters();

        foreach ($sets as $set) {
            foreach ($total as $key => $value) {
                $total[$key] += $set[$key];
            }
        }

        return $total;
    }
}
