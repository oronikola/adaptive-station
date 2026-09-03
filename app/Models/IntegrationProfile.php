<?php

namespace App\Models;

use App\Enums\IntegrationDirection;
use App\Enums\IntegrationProfileStatus;
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

/**
 * config_encrypted holds legacy database host/credentials/column-mapping —
 * readable only by server-side queue workers (LegacyMysqlConnector), never a
 * portal client. $hidden is a deliberate belt-and-suspenders alongside the
 * 'encrypted:array' cast: even a careless future `return $profile` in a
 * controller must not leak it.
 */
#[Fillable(['tenant_id', 'name', 'driver', 'direction', 'status', 'config_encrypted', 'last_successful_run_at'])]
#[ScopedBy(TenantScope::class)]
class IntegrationProfile extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    /** Lives in the per-tenant physical database, not the central one. */
    protected $connection = 'tenant';

    protected $hidden = ['config_encrypted'];

    protected function casts(): array
    {
        return [
            'direction' => IntegrationDirection::class,
            'status' => IntegrationProfileStatus::class,
            'config_encrypted' => 'encrypted:array',
            'last_successful_run_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function runs(): HasMany
    {
        return $this->hasMany(IntegrationRun::class);
    }

    public function importBatches(): HasMany
    {
        return $this->hasMany(ImportBatch::class);
    }

    public static function createForTenant(string $tenantId, array $attributes, ?User $actor = null): self
    {
        return DB::transaction(function () use ($tenantId, $attributes, $actor) {
            $profile = static::create([
                ...$attributes,
                'tenant_id' => $tenantId,
                'status' => $attributes['status'] ?? IntegrationProfileStatus::Disabled,
            ]);

            AuditLog::record('integration_profile.created', $actor, $tenantId, 'integration_profile', $profile->id, [
                'driver' => $profile->driver,
                'direction' => $profile->direction->value,
            ]);

            return $profile;
        });
    }

    /**
     * Config is write-only from the portal's perspective — the update form
     * never repopulates prior values, matching the shown-once-secret
     * convention used elsewhere (device tokens, activation codes).
     */
    public static function updateConfig(self $profile, array $config, ?User $actor = null): self
    {
        return DB::transaction(function () use ($profile, $config, $actor) {
            $profile->forceFill(['config_encrypted' => $config])->save();

            AuditLog::record('integration_profile.config_updated', $actor, $profile->tenant_id, 'integration_profile', $profile->id);

            return $profile;
        });
    }

    public static function updateStatus(self $profile, IntegrationProfileStatus $status, ?User $actor = null): self
    {
        return DB::transaction(function () use ($profile, $status, $actor) {
            $profile->forceFill(['status' => $status])->save();

            AuditLog::record('integration_profile.status_updated', $actor, $profile->tenant_id, 'integration_profile', $profile->id, [
                'status' => $status->value,
            ]);

            return $profile;
        });
    }
}
