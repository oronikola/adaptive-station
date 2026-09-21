<?php

namespace App\Models;

use App\Enums\IntegrationDirection;
use App\Enums\IntegrationProfileStatus;
use App\Enums\PersonType;
use App\Enums\TapEventType;
use App\Jobs\DispatchParentTapNotification;
use App\Jobs\PushTapEventToEssentielJob;
use App\Jobs\PushTapEventToLegacyJob;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use App\Services\Integrations\EssentielTapResolver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Tap records have no updated_at column. Their attendance details are fixed
 * at insertion; an Essentiel first-tap lookup may backfill only the person
 * identity once the external system resolves an uncached card.
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
     * @param  bool  $resolveEssentielSynchronously  Set only by
     *                                               TapEventResolveController — the kiosk's "this card isn't in my local
     *                                               cache, ask now and wait" fallback for an essentiel_api tenant. The
     *                                               ordinary batch-upload path leaves this false, so an essentiel tenant
     *                                               gets its resolution queued (PushTapEventToEssentielJob) instead,
     *                                               never blocking the batch upload response on an external HTTP call.
     * @return array{accepted: array<int, string>, rejected: array<int, array{id: mixed, errors: array}>, resolutions: array<string, array>, eventTypes: array<string, string>}
     */
    public static function acceptBatch(Station $station, array $events, bool $resolveEssentielSynchronously = false): array
    {
        $accepted = [];
        $rejected = [];
        $resolutions = [];
        // The kiosk's own submitted event_type is only ever a local guess
        // (see resolveEventType()'s docblock) — this reports back what the
        // server actually decided and stored, per event id, so the kiosk
        // can correct its local last_tap cache (and, if still on screen,
        // what it already told the person) instead of drifting out of sync
        // with what the portal shows for the exact same tap.
        $eventTypes = [];

        // Hoisted out of the loop — same tenant for the whole batch, and
        // this is a local table lookup (not the essentiel call itself), so
        // checking it per-event would just repeat the same query needlessly.
        // A tenant on essentiel_api gets its identity/guardian data and tap
        // history push from essentiel instead of the local-ParentAccount
        // notification + direct-database legacy push below — never both,
        // see PushTapEventToEssentielJob's docblock for why.
        $essentielProfile = IntegrationProfile::allTenants()
            ->where('tenant_id', $station->tenant_id)
            ->where('driver', 'essentiel_api')
            ->where('status', IntegrationProfileStatus::Active)
            ->whereIn('direction', [IntegrationDirection::ExportOnly, IntegrationDirection::Bidirectional])
            ->first();
        $usesEssentiel = $essentielProfile !== null;

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
            $attendanceDateLocal = $occurredAt->clone()->setTimezone($station->tenant->timezone)->toDateString();

            $rfidCard = RfidCard::where('card_uid', $cardUid)
                ->where('is_active', true)
                ->with('person')
                ->first();

            try {
                // The lock+read+insert all happen inside one transaction so
                // two devices tapping the same person within milliseconds of
                // each other can't both read "no prior tap yet" before
                // either has committed — see resolveEventType()'s docblock.
                // Locking the Person row (rather than a TapEvent row, which
                // may not exist yet for a first tap) is what actually
                // serializes the two transactions.
                $tapEvent = DB::connection('tenant')->transaction(function () use ($station, $rfidCard, $cardUid, $data, $occurredAt, $attendanceDateLocal) {
                    $personId = $rfidCard?->person_id;

                    if ($personId !== null) {
                        Person::query()->whereKey($personId)->lockForUpdate()->first();
                    }

                    $eventType = static::resolveEventType(
                        $station,
                        $personId,
                        $occurredAt,
                        $attendanceDateLocal,
                        TapEventType::from($data['event_type']),
                    );

                    return static::create([
                        'id' => $data['id'],
                        'tenant_id' => $station->tenant_id,
                        'station_id' => $station->id,
                        'person_id' => $personId,
                        'card_uid' => $cardUid,
                        'person_type' => $rfidCard?->person?->person_type,
                        'event_type' => $eventType,
                        'occurred_at' => $occurredAt,
                        'occurred_offset_minutes' => $data['occurred_offset_minutes'],
                        'received_at' => Date::now(),
                        'attendance_date_local' => $attendanceDateLocal,
                        'metadata' => $data['metadata'] ?? null,
                    ]);
                });

                $accepted[] = $data['id'];
                $eventTypes[$tapEvent->id] = $tapEvent->event_type->value;

                // Only for a genuinely new row — the duplicate-key branch
                // below means this tap already triggered a notification on
                // its first submission, and re-notifying on every kiosk
                // retry of an already-accepted tap would spam parents.
                if ($usesEssentiel) {
                    // Resolved regardless of local person_id — unlike the
                    // local-only path below, essentiel may still resolve a
                    // card this tenant's own roster has never seen, and
                    // auto-provisions it locally the first time that
                    // happens (see EssentielTapResolver). essentiel also
                    // sends the SMS from its own response, so resolving the
                    // local notification job too would text the guardian
                    // twice for one tap — this path instead of, never
                    // alongside, the two below.
                    if ($resolveEssentielSynchronously) {
                        $resolutions[$tapEvent->id] = app(EssentielTapResolver::class)
                            ->resolve($station->tenant, $essentielProfile, $tapEvent);
                    } else {
                        PushTapEventToEssentielJob::dispatch($tapEvent->tenant_id, $tapEvent->id);
                    }
                } elseif ($tapEvent->person_id !== null) {
                    if ($tapEvent->person_type === PersonType::Student) {
                        DispatchParentTapNotification::dispatch($tapEvent->tenant_id, $tapEvent->id);
                    }

                    // Real-time legacy sync, for a school that opted
                    // into it at onboarding — see PushTapEventToLegacyJob's
                    // docblock for why this is a silent no-op for every
                    // other tenant. Staff taps are included too (unlike
                    // the student-only notification above), since the
                    // legacy taphistory table tracks both.
                    PushTapEventToLegacyJob::dispatch($tapEvent->tenant_id, $tapEvent->id);
                }
            } catch (QueryException $e) {
                if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                    $accepted[] = $data['id'];
                    // A kiosk retry of an already-accepted tap still needs
                    // the real stored value here, not the value it happened
                    // to resubmit — the first submission is what was
                    // actually resolved and kept.
                    $eventTypes[$data['id']] = static::find($data['id'])?->event_type?->value;
                } else {
                    throw $e;
                }
            }
        }

        return ['accepted' => $accepted, 'rejected' => $rejected, 'resolutions' => $resolutions, 'eventTypes' => $eventTypes];
    }

    /**
     * The kiosk decides IN/OUT locally by toggling against its own
     * per-device IndexedDB cache of that person's last tap (see
     * kiosk-screen.tsx). That cache is scoped to one browser/device, so a
     * station paired with more than one kiosk device — or a device whose
     * local cache was reset — has no way to see a tap recorded by another
     * device, and both submit "IN" for what is really an IN then an OUT.
     * The server is the only place that can see every device's taps for a
     * person, so it recomputes the true direction here rather than trusting
     * whatever the kiosk sent, using it only as a fallback for a person the
     * server can't yet identify (an unrecognized card, resolved later by
     * essentiel — see EssentielTapResolver).
     *
     * Only toggles against a prior tap on the *same* local attendance date.
     * A person who never tapped OUT the day before (forgotten card, kiosk
     * outage, etc.) must still get IN for their first tap the next day,
     * rather than inheriting yesterday's dangling IN and being toggled
     * straight to OUT.
     */
    private static function resolveEventType(
        Station $station,
        ?string $personId,
        Carbon $occurredAt,
        string $attendanceDateLocal,
        TapEventType $requested,
    ): TapEventType {
        if ($personId === null) {
            return $requested;
        }

        $lastEvent = static::query()
            ->where('tenant_id', $station->tenant_id)
            ->where('person_id', $personId)
            ->where('occurred_at', '<=', $occurredAt)
            ->orderByDesc('occurred_at')
            ->orderByDesc('received_at')
            ->first();

        return static::nextEventType(
            $lastEvent?->attendance_date_local?->toDateString(),
            $lastEvent?->event_type,
            $attendanceDateLocal,
        );
    }

    /**
     * The pure toggle rule shared by resolveEventType() (one event at a
     * time, backed by a DB lookup of the prior event) and the
     * tap-events:backfill-direction console command (a whole person's
     * history at once, replayed in memory) — kept as one function so the two
     * can never drift into computing direction differently.
     */
    public static function nextEventType(?string $lastAttendanceDateLocal, ?TapEventType $lastEventType, string $attendanceDateLocal): TapEventType
    {
        if ($lastEventType === null || $lastAttendanceDateLocal !== $attendanceDateLocal) {
            return TapEventType::In;
        }

        return $lastEventType === TapEventType::Out ? TapEventType::In : TapEventType::Out;
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
