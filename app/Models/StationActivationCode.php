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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

#[Fillable(['station_id', 'code_hash', 'expires_at', 'created_by_user_id'])]
#[Hidden(['code_hash'])]
#[ScopedBy(TenantScope::class)]
class StationActivationCode extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    /**
     * station_activation_codes has no tenant_id column of its own — constrain
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

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Resolving a code is how a device establishes its tenant context in the
     * first place, so the eager-loaded station must bypass Station's own
     * TenantScope explicitly — no tenant context exists yet at this point.
     */
    public static function findValidByPlaintextCode(string $code): ?self
    {
        return static::allTenants()
            ->with(['station' => fn ($query) => $query->withoutGlobalScope(TenantScope::class)])
            ->where('code_hash', hash('sha256', $code))
            ->whereNull('consumed_at')
            ->where('expires_at', '>', Date::now())
            ->first();
    }

    /**
     * Atomically consumes a plaintext activation code, guaranteeing it can
     * never be redeemed twice even under concurrent requests.
     */
    public static function redeem(string $plaintextCode): ?self
    {
        return DB::transaction(function () use ($plaintextCode) {
            $activationCode = static::allTenants()
                ->with(['station' => fn ($query) => $query->withoutGlobalScope(TenantScope::class)])
                ->where('code_hash', hash('sha256', $plaintextCode))
                ->whereNull('consumed_at')
                ->where('expires_at', '>', Date::now())
                ->lockForUpdate()
                ->first();

            if ($activationCode === null) {
                return null;
            }

            $activationCode->forceFill(['consumed_at' => Date::now()])->save();

            return $activationCode;
        });
    }

    /**
     * Issues a new one-time activation code, returning the plaintext code
     * alongside the persisted (hashed) record. The plaintext is never
     * stored — surface it to the caller immediately and discard it.
     *
     * @return array{activationCode: self, code: string}
     */
    public static function issueFor(Station $station, User $createdBy, ?\DateTimeInterface $expiresAt = null): array
    {
        $code = Str::random(64);

        $activationCode = static::allTenants()->create([
            'station_id' => $station->id,
            'code_hash' => hash('sha256', $code),
            'expires_at' => $expiresAt ?? Date::now()->addHours(24),
            'created_by_user_id' => $createdBy->id,
        ]);

        return ['activationCode' => $activationCode, 'code' => $code];
    }
}
