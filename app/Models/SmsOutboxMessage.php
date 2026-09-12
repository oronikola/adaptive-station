<?php

namespace App\Models;

use App\Enums\SmsOutboxStatus;
use App\Models\Concerns\HasUuidV4;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

/**
 * One pending/sent SMS tap-alert, in the central database so the SMS
 * gateway device fleet can claim across every tenant from a single query
 * (see IP-007) — the fix for the legacy essentiel.ph bottleneck was exactly
 * this: no tenant/school filter anywhere in the claim path.
 */
#[Fillable([
    'tenant_id', 'person_id', 'parent_account_id', 'station_id', 'tap_event_id',
    'phone_number', 'message', 'status', 'expires_at',
    'claimed_by_device_id', 'claimed_at', 'attempts',
])]
class SmsOutboxMessage extends Model
{
    use HasUuidV4;

    protected $table = 'sms_outbox';

    protected $connection = 'mysql';

    const UPDATED_AT = null;

    /**
     * A device's claim on a row is released if not resolved within this
     * window — enforced by the scheduled sms:reclaim-stale-claims command,
     * not claimBatch() itself (see its docblock for why).
     */
    const CLAIM_LEASE_MINUTES = 5;

    /** After this many claims, a still-failing row dead-letters instead of recirculating. */
    const MAX_ATTEMPTS = 3;

    protected function casts(): array
    {
        return [
            'status' => SmsOutboxStatus::class,
            'claimed_at' => 'datetime',
            'expires_at' => 'datetime',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Same central `mysql` connection as Tenant, so this is a normal
     * relation despite sms_outbox having no foreign key on tenant_id (see
     * the migration's comment on why: it's a plain uuid column, validated
     * at the app layer only).
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Atomically reserves up to $batchSize pending rows for $device, across
     * every tenant. `->lock('for update skip locked')` is what lets 20-40
     * concurrent devices poll the same table without ever double-claiming a
     * row or blocking on each other.
     *
     * Critical invariant: no tenant/station filter here. That omission is
     * the entire fix for the legacy essentiel.ph per-school assignment
     * bottleneck (see IP-007) — do not reintroduce one.
     *
     * Deliberately filters on `status = 'pending'` alone rather than also
     * inline-reclaiming lease-expired `claimed` rows here: an OR across two
     * status branches can't be satisfied by a single ordered index range
     * scan, which forces MariaDB into a filesort — and a filesort under
     * `FOR UPDATE` locks every row it reads to sort, not just the ones the
     * LIMIT keeps, which lets one device's claim transaction lock the
     * entire candidate pool and starve concurrent pollers. The scheduled
     * `sms:reclaim-stale-claims` command (every minute) is the sole path
     * back to `pending` for an abandoned claim — a ~1 minute worst case is
     * an acceptable trade for keeping this hot path index-ordered and lock
     * scoped to only the rows actually claimed.
     */
    public static function claimBatch(SmsGatewayDevice $device, int $batchSize): Collection
    {
        return DB::connection('mysql')->transaction(function () use ($device, $batchSize) {
            $now = Date::now();

            $ids = static::query()
                ->where('status', SmsOutboxStatus::Pending->value)
                ->where('expires_at', '>', $now)
                ->orderBy('created_at')
                ->limit($batchSize)
                // Laravel's query builder has no skipLocked() helper (only
                // lockForUpdate()/sharedLock()) — ->lock() accepts a raw
                // lock clause string, which is how "FOR UPDATE SKIP LOCKED"
                // is expressed. Requires MariaDB 10.6+/MySQL 8.0+.
                ->lock('for update skip locked')
                ->pluck('id');

            if ($ids->isEmpty()) {
                return collect();
            }

            // Individual per-row saves (PK equality), not a single bulk
            // `UPDATE ... WHERE id IN (...)`: a multi-value IN-list update
            // isn't guaranteed to reach the rows via the primary key — on a
            // small/low-cardinality table MariaDB can instead scan a
            // secondary index (e.g. the very one the SELECT above just
            // used), which locks every row it scans to evaluate the filter,
            // not just the ones that match. That would let this claim
            // transaction block on — or block — rows a concurrent poller
            // is holding, defeating the point of skip-locked entirely. A
            // plain `WHERE id = ?` is always index-served regardless of
            // table size, and every row here is already X-locked by this
            // same transaction from the SELECT above, so this never waits.
            $rows = static::query()->whereIn('id', $ids)->get();
            foreach ($rows as $row) {
                $row->forceFill([
                    'status' => SmsOutboxStatus::Claimed,
                    'claimed_by_device_id' => $device->id,
                    'claimed_at' => $now,
                    'attempts' => $row->attempts + 1,
                ])->save();
            }

            return $rows;
        });
    }

    public function markSent(): void
    {
        $this->forceFill(['status' => SmsOutboxStatus::Sent, 'sent_at' => Date::now()])->save();
    }

    /**
     * The carrier's delivery report — arrives asynchronously, independent
     * of the original send/claim cycle, sometimes seconds to minutes later
     * (and sometimes never, carrier-dependent). Only valid from `sent`: a
     * device can't claim delivery on a message it never successfully sent
     * (markFailed() clears claimed_by_device_id, so the reportStatus
     * ownership scope already blocks a delivery report after a failure).
     */
    public function markDelivered(): void
    {
        $this->forceFill(['status' => SmsOutboxStatus::Delivered, 'delivered_at' => Date::now()])->save();
    }

    /**
     * A failed send goes back into the pool for another device to try (a
     * bad SIM/radio hiccup on one phone shouldn't kill a message when 20+
     * others could send it) until MAX_ATTEMPTS, then dead-letters — an
     * undeliverable number shouldn't loop forever and waste fleet capacity.
     */
    public function markFailed(?string $error = null): void
    {
        $deadLetter = $this->attempts >= self::MAX_ATTEMPTS;

        $this->forceFill([
            'status' => $deadLetter ? SmsOutboxStatus::Failed : SmsOutboxStatus::Pending,
            'claimed_by_device_id' => null,
            'claimed_at' => null,
            'last_error' => $error,
        ])->save();
    }
}
