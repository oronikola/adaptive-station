<?php

namespace App\Models;

use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;

#[Fillable(['station_id', 'token_hash', 'label', 'expires_at'])]
#[Hidden(['token_hash'])]
#[ScopedBy(TenantScope::class)]
class StationCredential extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /**
     * station_credentials has no tenant_id column of its own — constrain
     * through the owning station instead of the default column-based filter.
     */
    public function applyTenantScope(Builder $builder, string $tenantId): void
    {
        $builder->whereHas('station', fn (Builder $query) => $query->where('tenant_id', $tenantId));
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    /**
     * Resolving a credential is how a device establishes its tenant context
     * in the first place, so the eager-loaded station must bypass Station's
     * own TenantScope explicitly — no tenant context exists yet at this point
     * for that scope to filter by.
     */
    public static function findActiveByPlaintextToken(string $token): ?self
    {
        return static::allTenants()
            ->with(['station' => fn ($query) => $query->withoutGlobalScope(TenantScope::class)])
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')
            ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', Date::now()))
            ->first();
    }

    /**
     * Issues a new credential for a station, returning the one-time plaintext
     * token alongside the persisted (hashed) record. The plaintext is never
     * stored — callers must surface it to the caller/device immediately and
     * discard it. $actor may be a User (portal-issued rotation) or the
     * Station itself (device-initiated activation) — AuditLog::record()
     * supports both actor types.
     *
     * @return array{credential: self, token: string}
     */
    public static function issueFor(Station $station, ?string $label = null, ?Model $actor = null): array
    {
        $token = Str::random(64);

        $credential = static::allTenants()->create([
            'station_id' => $station->id,
            'token_hash' => hash('sha256', $token),
            'label' => $label,
        ]);

        AuditLog::record('station_credential.issued', $actor, $station->tenant_id, 'station_credential', $credential->id);

        return ['credential' => $credential, 'token' => $token];
    }

    /**
     * Revokes a credential, audited. Does not delete local event history —
     * a revoked station's already-synced tap_events remain intact.
     */
    public static function revoke(self $credential, ?User $actor = null): self
    {
        $credential->forceFill(['revoked_at' => Date::now()])->save();

        AuditLog::record('station_credential.revoked', $actor, $credential->station->tenant_id, 'station_credential', $credential->id);

        return $credential;
    }
}
