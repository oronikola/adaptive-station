<?php

namespace App\Models;

use App\Enums\TenantStatus;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;

/**
 * Same "hashed bearer token as the credential row itself" pattern as
 * App\Models\StationCredential, applied to the parent mobile app instead of
 * kiosk devices — see App\Http\Middleware\AuthenticateParent.
 */
#[Fillable(['tenant_id', 'parent_account_id', 'token_hash', 'label', 'expires_at'])]
#[Hidden(['token_hash'])]
#[ScopedBy(TenantScope::class)]
class ParentAccessToken extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    /** Explicit for the same cross-connection-relation reason as Tenant. */
    protected $connection = 'mysql';

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function parentAccount(): BelongsTo
    {
        return $this->belongsTo(ParentAccount::class);
    }

    /**
     * Resolving a token is how a parent request establishes its tenant
     * context in the first place, so this deliberately bypasses TenantScope
     * the same way StationCredential::findActiveByPlaintextToken() does —
     * callers must read tenant_id off the result and set tenant context
     * before touching any tenant-scoped model.
     */
    public static function findActiveByPlaintextToken(string $token): ?self
    {
        return static::allTenants()
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')
            ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', Date::now()))
            ->first();
    }

    /**
     * Issues a new token for a parent, returning the one-time plaintext
     * alongside the persisted (hashed) record. The plaintext is never
     * stored — callers must return it to the mobile app immediately.
     *
     * @return array{credential: self, token: string}
     */
    public static function issueFor(ParentAccount $parent, ?string $label = null): array
    {
        $token = Str::random(64);

        $credential = static::allTenants()->create([
            'tenant_id' => $parent->tenant_id,
            'parent_account_id' => $parent->id,
            'token_hash' => hash('sha256', $token),
            'label' => $label,
        ]);

        return ['credential' => $credential, 'token' => $token];
    }

    public static function revoke(self $credential): self
    {
        $credential->forceFill(['revoked_at' => Date::now()])->save();

        return $credential;
    }

    /**
     * Single choke point for "which parent is this bearer token" — used by
     * both AuthenticateParent (the parent REST API) and the 'parent-token'
     * auth guard (Reverb's private-channel broadcasting auth endpoint), so
     * the two never drift apart on what makes a token/account valid.
     * Establishes tenant context/db as a side effect, same as
     * AuthenticateStation — resolving the token is how a parent request
     * finds out which tenant it belongs to in the first place.
     *
     * @return array{parent: ParentAccount, credential: self}|null
     */
    public static function authenticate(?string $token): ?array
    {
        if ($token === null) {
            return null;
        }

        $credential = static::findActiveByPlaintextToken($token);
        if ($credential === null) {
            return null;
        }

        $tenant = Tenant::find($credential->tenant_id);
        if ($tenant === null || $tenant->status !== TenantStatus::Active) {
            return null;
        }

        TenantDatabase::use($tenant);
        app(TenantContext::class)->set($tenant->id);

        $parent = ParentAccount::allTenants()->whereKey($credential->parent_account_id)->first();
        if ($parent?->is_active !== true) {
            return null;
        }

        $credential->forceFill(['last_used_at' => Date::now()])->save();

        return ['parent' => $parent, 'credential' => $credential];
    }
}
