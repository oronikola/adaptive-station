<?php

namespace App\Models;

use App\Enums\MasterDataEntityType;
use App\Enums\MasterDataOperation;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'tenant_id', 'person_id', 'card_uid', 'is_active', 'assigned_at', 'deactivated_at',
    'source_system', 'source_record_id',
])]
#[ScopedBy(TenantScope::class)]
class RfidCard extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    /** Lives in the per-tenant physical database, not the central one. */
    protected $connection = 'tenant';

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'assigned_at' => 'datetime',
            'deactivated_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }

    /**
     * Single source of truth for the "case-normalized per scanner convention"
     * rule (ADAPTIVE_STATION_DATABASE_DESIGN.md §4.3) — used both for card
     * lookups (device batch upload) and future card CRUD writes.
     */
    public static function normalizeCardUid(string $uid): string
    {
        return strtoupper(trim($uid));
    }

    /**
     * Assigns a new card to a person, recording the mandatory master-data
     * change + audit log as one atomic unit.
     */
    public static function assign(string $tenantId, string $personId, string $cardUid, ?User $actor = null): self
    {
        return DB::transaction(function () use ($tenantId, $personId, $cardUid, $actor) {
            $card = static::create([
                'tenant_id' => $tenantId,
                'person_id' => $personId,
                'card_uid' => static::normalizeCardUid($cardUid),
                'is_active' => true,
                'assigned_at' => Date::now(),
            ]);

            MasterDataChange::record(
                $tenantId, MasterDataEntityType::RfidCard, $card->id,
                MasterDataOperation::Upsert, $card->toMasterDataPayload(),
            );
            AuditLog::record('rfid_card.assigned', $actor, $tenantId, 'rfid_card', $card->id, ['person_id' => $personId]);

            return $card;
        });
    }

    /**
     * Replaces a card: deactivates the old row and creates a new one, rather
     * than editing card_uid in place. This is required, not just stylistic —
     * uq_rfid_cards_tenant_uid is not filtered by is_active, so a retired
     * card_uid can never be reused within a tenant except by reactivating
     * that exact row; treating "replace" as a new physical card is the
     * correct model. Produces two master_data_changes rows so a kiosk that
     * cached the old UID stops accepting offline taps against it.
     */
    public static function replace(self $card, string $newCardUid, ?User $actor = null): self
    {
        return DB::transaction(function () use ($card, $newCardUid, $actor) {
            $card->forceFill(['is_active' => false, 'deactivated_at' => Date::now()])->save();
            MasterDataChange::record(
                $card->tenant_id, MasterDataEntityType::RfidCard, $card->id,
                MasterDataOperation::Deactivate, $card->toMasterDataPayload(),
            );

            $newCard = static::create([
                'tenant_id' => $card->tenant_id,
                'person_id' => $card->person_id,
                'card_uid' => static::normalizeCardUid($newCardUid),
                'is_active' => true,
                'assigned_at' => Date::now(),
            ]);
            MasterDataChange::record(
                $card->tenant_id, MasterDataEntityType::RfidCard, $newCard->id,
                MasterDataOperation::Upsert, $newCard->toMasterDataPayload(),
            );

            AuditLog::record('rfid_card.replaced', $actor, $card->tenant_id, 'rfid_card', $newCard->id, [
                'previous_card_id' => $card->id,
            ]);

            return $newCard;
        });
    }

    public static function deactivate(self $card, ?User $actor = null): self
    {
        return DB::transaction(function () use ($card, $actor) {
            $card->forceFill(['is_active' => false, 'deactivated_at' => Date::now()])->save();

            MasterDataChange::record(
                $card->tenant_id, MasterDataEntityType::RfidCard, $card->id,
                MasterDataOperation::Deactivate, $card->toMasterDataPayload(),
            );
            AuditLog::record('rfid_card.deactivated', $actor, $card->tenant_id, 'rfid_card', $card->id);

            return $card;
        });
    }

    /**
     * Projection consumed by the kiosk's local rfid_cards_cache — used for
     * both upsert and deactivate master_data_changes payloads.
     */
    protected function toMasterDataPayload(): array
    {
        return [
            'id' => $this->id,
            'person_id' => $this->person_id,
            'card_uid' => $this->card_uid,
            'is_active' => $this->is_active,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
