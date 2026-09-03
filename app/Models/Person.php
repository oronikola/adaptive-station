<?php

namespace App\Models;

use App\Enums\MasterDataEntityType;
use App\Enums\MasterDataOperation;
use App\Enums\PersonType;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'tenant_id', 'external_id', 'person_type', 'first_name', 'middle_name', 'last_name',
    'display_name', 'grade_level', 'section', 'photo_url', 'is_active', 'deactivated_at',
    'metadata', 'source_system', 'source_record_id',
])]
#[ScopedBy(TenantScope::class)]
class Person extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4, SoftDeletes;

    protected function casts(): array
    {
        return [
            'person_type' => PersonType::class,
            'is_active' => 'boolean',
            'deactivated_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function rfidCards(): HasMany
    {
        return $this->hasMany(RfidCard::class);
    }

    public function tapEvents(): HasMany
    {
        return $this->hasMany(TapEvent::class);
    }

    /**
     * Creates a person and records the mandatory master-data change + audit
     * log as one atomic unit — every write path that creates a person must
     * go through here, never Person::create() directly, so the kiosk change
     * feed can never silently miss a new person.
     */
    public static function registerForTenant(string $tenantId, array $attributes, ?User $actor = null): self
    {
        $attributes['display_name'] ??= static::deriveDisplayName($attributes);

        return DB::transaction(function () use ($tenantId, $attributes, $actor) {
            $person = static::create([
                ...$attributes,
                'tenant_id' => $tenantId,
                'is_active' => true,
            ]);

            MasterDataChange::record(
                $tenantId, MasterDataEntityType::Person, $person->id,
                MasterDataOperation::Upsert, $person->toMasterDataPayload(),
            );
            AuditLog::record('person.created', $actor, $tenantId, 'person', $person->id);

            return $person;
        });
    }

    public static function updateDetails(self $person, array $attributes, ?User $actor = null): self
    {
        if (array_key_exists('display_name', $attributes) && trim((string) $attributes['display_name']) === '') {
            $attributes['display_name'] = static::deriveDisplayName([...$person->toArray(), ...$attributes]);
        }

        return DB::transaction(function () use ($person, $attributes, $actor) {
            $person->fill($attributes)->save();

            MasterDataChange::record(
                $person->tenant_id, MasterDataEntityType::Person, $person->id,
                MasterDataOperation::Upsert, $person->toMasterDataPayload(),
            );
            AuditLog::record('person.updated', $actor, $person->tenant_id, 'person', $person->id);

            return $person;
        });
    }

    public static function deactivate(self $person, ?User $actor = null): self
    {
        return DB::transaction(function () use ($person, $actor) {
            $person->forceFill(['is_active' => false, 'deactivated_at' => Date::now()])->save();

            MasterDataChange::record(
                $person->tenant_id, MasterDataEntityType::Person, $person->id,
                MasterDataOperation::Deactivate, $person->toMasterDataPayload(),
            );
            AuditLog::record('person.deactivated', $actor, $person->tenant_id, 'person', $person->id);

            return $person;
        });
    }

    public static function reactivate(self $person, ?User $actor = null): self
    {
        return DB::transaction(function () use ($person, $actor) {
            $person->forceFill(['is_active' => true, 'deactivated_at' => null])->save();

            MasterDataChange::record(
                $person->tenant_id, MasterDataEntityType::Person, $person->id,
                MasterDataOperation::Upsert, $person->toMasterDataPayload(),
            );
            AuditLog::record('person.reactivated', $actor, $person->tenant_id, 'person', $person->id);

            return $person;
        });
    }

    protected static function deriveDisplayName(array $attributes): string
    {
        return trim(collect([
            $attributes['first_name'] ?? null,
            $attributes['middle_name'] ?? null,
            $attributes['last_name'] ?? null,
        ])->filter()->implode(' '));
    }

    /**
     * Projection consumed by the kiosk's local people_cache — used for both
     * upsert and deactivate master_data_changes payloads, so the kiosk never
     * needs to special-case payload shape by operation type.
     */
    protected function toMasterDataPayload(): array
    {
        return [
            'id' => $this->id,
            'external_id' => $this->external_id,
            'person_type' => $this->person_type->value,
            'display_name' => $this->display_name,
            'grade_level' => $this->grade_level,
            'section' => $this->section,
            'photo_url' => $this->photo_url,
            'is_active' => $this->is_active,
            'metadata' => $this->metadata,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
