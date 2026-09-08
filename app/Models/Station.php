<?php

namespace App\Models;

use App\Enums\MasterDataEntityType;
use App\Enums\MasterDataOperation;
use App\Enums\StationStatus;
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
use Illuminate\Support\Facades\DB;

#[Fillable(['tenant_id', 'name', 'station_code', 'status', 'app_version', 'configuration', 'legacy_station_id'])]
#[ScopedBy(TenantScope::class)]
class Station extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    /** Lives in the per-tenant physical database, not the central one. */
    protected $connection = 'tenant';

    protected function casts(): array
    {
        return [
            'status' => StationStatus::class,
            'configuration' => 'array',
            'last_seen_at' => 'datetime',
            'last_scan_at' => 'datetime',
            'last_pending_count' => 'integer',
        ];
    }

    /**
     * station_code is unique per tenant (not globally), so route model
     * binding on it is only safe where a tenant scope is already active —
     * i.e. portal routes. Platform routes resolve stations explicitly via
     * allTenants() instead and never rely on this.
     */
    public function getRouteKeyName(): string
    {
        return 'station_code';
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function credentials(): HasMany
    {
        return $this->hasMany(StationCredential::class);
    }

    public function activationCodes(): HasMany
    {
        return $this->hasMany(StationActivationCode::class);
    }

    /**
     * Creates a station and records the mandatory master-data change + audit
     * log as one atomic unit, per ADR-004 ("every mutation to a ... station
     * configuration must additionally write a master_data_changes row").
     */
    public static function provision(array $attributes, ?User $actor = null): self
    {
        return DB::transaction(function () use ($attributes, $actor) {
            $station = static::allTenants()->create([
                ...$attributes,
                'status' => StationStatus::PendingActivation,
            ]);

            MasterDataChange::record(
                $station->tenant_id, MasterDataEntityType::StationConfig, $station->id,
                MasterDataOperation::Upsert, ['id' => $station->id, 'name' => $station->name, 'station_code' => $station->station_code],
            );
            AuditLog::record('station.created', $actor, $station->tenant_id, 'station', $station->id);

            return $station;
        });
    }

    /**
     * Reverts an already-activated station back to pending_activation so it
     * can be re-provisioned with a fresh activation code — e.g. a kiosk that
     * lost its device credential and needs to redo the first-time setup
     * flow. Revokes every still-active credential the station holds, since
     * leaving them live would defeat the point of forcing re-activation.
     */
    public static function resetToPendingActivation(self $station, ?User $actor = null): self
    {
        return DB::transaction(function () use ($station, $actor) {
            $station->forceFill(['status' => StationStatus::PendingActivation])->save();

            $station->credentials()->whereNull('revoked_at')->get()->each(
                fn (StationCredential $credential) => StationCredential::revoke($credential, $actor),
            );

            MasterDataChange::record(
                $station->tenant_id, MasterDataEntityType::StationConfig, $station->id,
                MasterDataOperation::Upsert, ['id' => $station->id, 'status' => $station->status->value],
            );
            AuditLog::record('station.reset_to_pending', $actor, $station->tenant_id, 'station', $station->id);

            return $station;
        });
    }

    /**
     * Updates a station's operational/display configuration — the same JSON
     * this.configuration column DeviceConfigController returns to the kiosk
     * verbatim, so no fixed schema is assumed here.
     */
    public static function updateConfiguration(self $station, array $configuration, ?User $actor = null): self
    {
        return DB::transaction(function () use ($station, $configuration, $actor) {
            $station->forceFill(['configuration' => $configuration])->save();

            MasterDataChange::record(
                $station->tenant_id, MasterDataEntityType::StationConfig, $station->id,
                MasterDataOperation::Upsert, ['id' => $station->id, 'configuration' => $configuration],
            );
            AuditLog::record('station.configuration_updated', $actor, $station->tenant_id, 'station', $station->id);

            return $station;
        });
    }

    /**
     * Creates a placeholder station for a distinct legacy station_id
     * encountered during a taphistory import, so imported tap_events always
     * have a real Adaptive Station station to attach to. A tenant admin later
     * renames/activates it as a real kiosk (IP-004 station detail page).
     */
    public static function registerLegacyPlaceholder(string $tenantId, string $legacyStationId, ?User $actor = null): self
    {
        return DB::transaction(function () use ($tenantId, $legacyStationId, $actor) {
            $station = static::allTenants()->create([
                'tenant_id' => $tenantId,
                'name' => "Legacy Station {$legacyStationId}",
                'station_code' => 'LEGACY-'.$legacyStationId,
                'status' => StationStatus::PendingActivation,
                'legacy_station_id' => $legacyStationId,
            ]);

            MasterDataChange::record(
                $tenantId, MasterDataEntityType::StationConfig, $station->id,
                MasterDataOperation::Upsert, ['id' => $station->id, 'name' => $station->name, 'station_code' => $station->station_code],
            );
            AuditLog::record('station.legacy_placeholder_created', $actor, $tenantId, 'station', $station->id, [
                'legacy_station_id' => $legacyStationId,
            ]);

            return $station;
        });
    }
}
