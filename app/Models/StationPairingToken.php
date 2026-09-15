<?php

namespace App\Models;

use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * A long-lived, reusable pairing secret embedded in a kiosk's device link/QR
 * code — the alternative to StationActivationCode's one-time typed code (see
 * ADR "kiosk pairing link"). Unlike an activation code it is never marked
 * "consumed": the same link keeps working across re-scans (e.g. a kiosk that
 * lost its local IndexedDB credential re-pairs itself without a portal admin
 * issuing anything new), and the only way to stop it working is to revoke it,
 * which issueFor() also does automatically to whatever link preceded it —
 * only one pairing link is ever live per station at a time.
 */
#[Fillable(['tenant_id', 'station_id', 'token_hash', 'created_by_user_id'])]
#[Hidden(['token_hash'])]
#[ScopedBy(TenantScope::class)]
class StationPairingToken extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    /** Explicit for the same cross-connection-relation reason as Tenant. */
    protected $connection = 'mysql';

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
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
     * Resolving a pairing token is how a device establishes its tenant
     * context in the first place — deliberately does NOT eager-load
     * `station`, since that model lives on the per-tenant connection and the
     * caller hasn't pointed it at the right tenant's database yet. Callers
     * must read `tenant_id`/`station_id` off the returned row, call
     * App\Support\TenantDatabase::use() for that tenant, and only then query
     * Station separately.
     */
    public static function findActiveByPlaintextToken(string $token): ?self
    {
        return static::allTenants()
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')
            ->first();
    }

    /**
     * Records this link's use without invalidating it — unlike
     * StationActivationCode::redeem(), a pairing link is meant to be reused
     * (the same QR sticker keeps working after a kiosk's local credential is
     * cleared). lockForUpdate still guards the read against a concurrent
     * revoke() landing mid-request.
     */
    public static function redeem(string $plaintextToken): ?self
    {
        return DB::transaction(function () use ($plaintextToken) {
            $pairingToken = static::allTenants()
                ->where('token_hash', hash('sha256', $plaintextToken))
                ->whereNull('revoked_at')
                ->lockForUpdate()
                ->first();

            if ($pairingToken === null) {
                return null;
            }

            $pairingToken->forceFill(['last_used_at' => Date::now()])->save();

            return $pairingToken;
        });
    }

    /**
     * Issues a new pairing link for a station, returning the plaintext token
     * alongside the persisted (hashed) record. The plaintext is never
     * stored — surface it to the caller immediately and discard it.
     * Revokes any pairing link already active for this station first, so a
     * regenerated link/QR immediately invalidates the old one instead of
     * leaving two live secrets for the same station.
     *
     * @return array{pairingToken: self, token: string}
     */
    public static function issueFor(Station $station, ?User $createdBy = null): array
    {
        return DB::transaction(function () use ($station, $createdBy) {
            static::allTenants()
                ->where('station_id', $station->id)
                ->whereNull('revoked_at')
                ->get()
                ->each(fn (self $existing) => self::revoke($existing, $createdBy));

            $token = Str::random(64);

            $pairingToken = static::allTenants()->create([
                'tenant_id' => $station->tenant_id,
                'station_id' => $station->id,
                'token_hash' => hash('sha256', $token),
                'created_by_user_id' => $createdBy?->id,
            ]);

            AuditLog::record('station_pairing_token.issued', $createdBy, $station->tenant_id, 'station', $station->id, [
                'station_pairing_token_id' => $pairingToken->id,
            ]);

            return ['pairingToken' => $pairingToken, 'token' => $token];
        });
    }

    /**
     * Revokes a pairing link, audited. Does not affect device credentials
     * already issued through it — those are their own separate
     * StationCredential rows, revoked independently.
     */
    public static function revoke(self $pairingToken, ?User $actor = null): self
    {
        $pairingToken->forceFill(['revoked_at' => Date::now()])->save();

        AuditLog::record('station_pairing_token.revoked', $actor, $pairingToken->tenant_id, 'station', $pairingToken->station_id, [
            'station_pairing_token_id' => $pairingToken->id,
        ]);

        return $pairingToken;
    }
}
