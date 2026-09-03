<?php

namespace App\Models;

use App\Enums\PersonType;
use App\Enums\TapEventType;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Immutable — no updated_at column, and rows are never modified after
 * insertion (adjustments are represented as new events, not overwrites).
 */
#[Fillable([
    'id', 'tenant_id', 'station_id', 'person_id', 'card_uid', 'person_type', 'event_type',
    'occurred_at', 'occurred_offset_minutes', 'received_at', 'attendance_date_local',
    'source_system', 'source_record_id', 'import_batch_id', 'metadata',
])]
#[ScopedBy(TenantScope::class)]
class TapEvent extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    /** Lives in the per-tenant physical database, not the central one. */
    protected $connection = 'tenant';

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'person_type' => PersonType::class,
            'event_type' => TapEventType::class,
            'occurred_at' => 'datetime',
            'received_at' => 'datetime',
            'attendance_date_local' => 'date',
            'metadata' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }

    /**
     * Shared by the portal attendance search page and its CSV export, so the
     * two can never drift out of sync with each other.
     *
     * @param  array{date_from?: string, date_to?: string, person_id?: string, card_uid?: string, station_id?: string, event_type?: string}  $filters
     */
    public function scopeSearch(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['date_from'] ?? null, fn (Builder $q, $date) => $q->whereDate('attendance_date_local', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $q, $date) => $q->whereDate('attendance_date_local', '<=', $date))
            ->when($filters['person_id'] ?? null, fn (Builder $q, $id) => $q->where('person_id', $id))
            ->when($filters['card_uid'] ?? null, fn (Builder $q, $uid) => $q->where('card_uid', RfidCard::normalizeCardUid($uid)))
            ->when($filters['station_id'] ?? null, fn (Builder $q, $id) => $q->where('station_id', $id))
            ->when($filters['event_type'] ?? null, fn (Builder $q, $type) => $q->where('event_type', $type))
            ->orderByDesc('occurred_at');
    }

    /**
     * Validates and inserts a batch of kiosk-submitted tap events for the
     * authenticated station, tenant/station always server-derived (never
     * trusted from the payload). Each item is validated independently so one
     * malformed item does not sink its valid siblings.
     *
     * Idempotency is enforced by attempting the insert and treating a
     * duplicate-primary-key violation as an already-accepted no-op, rather
     * than a select-then-insert, which would race under concurrent duplicate
     * submission (e.g. overlapping kiosk retry timers).
     *
     * @return array{accepted: array<int, string>, rejected: array<int, array{id: mixed, errors: array}>}
     */
    public static function acceptBatch(Station $station, array $events): array
    {
        $accepted = [];
        $rejected = [];

        foreach ($events as $event) {
            $event = is_array($event) ? $event : [];
            $id = $event['id'] ?? null;

            $validator = Validator::make($event, [
                'id' => ['required', 'uuid'],
                'card_uid' => ['required', 'string', 'max:100'],
                'event_type' => ['required', Rule::enum(TapEventType::class)],
                'occurred_at' => ['required', 'date'],
                'occurred_offset_minutes' => ['required', 'integer', 'between:-720,840'],
                'metadata' => ['nullable', 'array'],
            ]);

            if ($validator->fails()) {
                $rejected[] = ['id' => $id, 'errors' => $validator->errors()->toArray()];

                continue;
            }

            $data = $validator->validated();
            $cardUid = RfidCard::normalizeCardUid($data['card_uid']);
            $occurredAt = Carbon::parse($data['occurred_at'])->utc();

            $rfidCard = RfidCard::where('card_uid', $cardUid)
                ->where('is_active', true)
                ->with('person')
                ->first();

            try {
                static::create([
                    'id' => $data['id'],
                    'tenant_id' => $station->tenant_id,
                    'station_id' => $station->id,
                    'person_id' => $rfidCard?->person_id,
                    'card_uid' => $cardUid,
                    'person_type' => $rfidCard?->person?->person_type,
                    'event_type' => $data['event_type'],
                    'occurred_at' => $occurredAt,
                    'occurred_offset_minutes' => $data['occurred_offset_minutes'],
                    'received_at' => Date::now(),
                    'attendance_date_local' => $occurredAt->clone()->setTimezone($station->tenant->timezone)->toDateString(),
                    'metadata' => $data['metadata'] ?? null,
                ]);

                $accepted[] = $data['id'];
            } catch (QueryException $e) {
                if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                    $accepted[] = $data['id'];
                } else {
                    throw $e;
                }
            }
        }

        return ['accepted' => $accepted, 'rejected' => $rejected];
    }

    /**
     * Inserts a single legacy-imported event, catching a duplicate-key
     * violation on uq_tap_events_import_source as "already imported" rather
     * than failing — the same insert-and-catch pattern as acceptBatch(),
     * needed because two overlapping import runs (or a stable-ID check race)
     * must never produce two rows for the same source record.
     */
    public static function importOne(string $tenantId, array $attributes): bool
    {
        try {
            static::create([...$attributes, 'tenant_id' => $tenantId]);

            return true;
        } catch (QueryException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                return false;
            }

            throw $e;
        }
    }
}
