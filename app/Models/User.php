<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use App\Models\Concerns\HasUuidV4;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Deliberately NOT tenant-scoped via App\Models\Scopes\TenantScope. Platform
 * super-admin login/session resolution and cross-tenant user management by
 * platform admins are normal, frequent operations for this model, not rare
 * escape hatches — so a blanket global scope would need bypassing on nearly
 * every platform query. Tenant-boundary enforcement for User instead lives in
 * App\Policies\UserPolicy and explicit tenant_id filters in tenant-portal
 * controllers.
 */
#[Fillable(['name', 'email', 'password', 'password_plaintext', 'tenant_id', 'role', 'is_active', 'last_login_at', 'must_reset_password'])]
#[Hidden(['password', 'password_plaintext', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUuidV4, Notifiable;

    /**
     * Explicit, not just "the default connection by omission" — a tenant-
     * connection model's belongsTo(User::class) relation would otherwise
     * silently inherit the CALLER's connection (Eloquent's
     * newRelatedInstance() does this whenever the related model has no
     * $connection of its own), which is wrong for a central table like this
     * one. Same reasoning applies to Tenant/StationCredential/
     * StationActivationCode/AuditLog.
     */
    protected $connection = 'mysql';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'password_plaintext' => 'encrypted',
            'role' => UserRole::class,
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'must_reset_password' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $user): void {
            if (! $user->role instanceof UserRole) {
                return;
            }

            if ($user->role->requiresNullTenant() && $user->tenant_id !== null) {
                throw new RuntimeException('A platform_super_admin user must have a null tenant_id.');
            }

            if (! $user->role->requiresNullTenant() && $user->tenant_id === null) {
                throw new RuntimeException("A {$user->role->value} user must have a non-null tenant_id.");
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isPlatformSuperAdmin(): bool
    {
        return $this->role === UserRole::PlatformSuperAdmin;
    }

    public function isTenantAdmin(): bool
    {
        return $this->role === UserRole::TenantAdmin;
    }

    public function isTenantOperator(): bool
    {
        return $this->role === UserRole::TenantOperator;
    }

    public function belongsToTenant(?string $tenantId): bool
    {
        return $tenantId !== null && $this->tenant_id === $tenantId;
    }

    /**
     * Provisions a user for a tenant (either role). The inviting admin may
     * supply their own password in $attributes['password'] (e.g. to hand the
     * account straight to someone in person); otherwise one is generated.
     * The password actually used is both hashed into `password` (for login)
     * and stored encrypted-but-recoverable in `password_plaintext`, at the
     * platform operator's explicit request, so the Admin Users panel can
     * reveal it anytime rather than only once via a flash — see the
     * migration adding that column for the security tradeoff this implies.
     * `temporary_password` is still returned for callers that still want a
     * one-time flash (the tenant portal's own "invite a user" flow). Used
     * both by the platform portal (creating a tenant's first admin) and the
     * tenant portal (a
     * tenant_admin inviting additional admins/operators for their own
     * school) — same operation either way.
     *
     * @return array{user: self, temporary_password: string}
     */
    public static function provisionForTenant(Tenant $tenant, UserRole $role, array $attributes, ?self $actor = null): array
    {
        $password = $attributes['password'] ?? Str::password(16);
        unset($attributes['password'], $attributes['password_confirmation']);

        return DB::transaction(function () use ($tenant, $role, $attributes, $password, $actor) {
            $user = static::create([
                ...$attributes,
                'tenant_id' => $tenant->id,
                'role' => $role,
                'password' => $password,
                'password_plaintext' => $password,
                'is_active' => true,
                'email_verified_at' => Date::now(),
            ]);

            AuditLog::record(
                'user.created', $actor, $tenant->id, 'user', $user->id,
                ['role' => $role->value],
            );

            return ['user' => $user, 'temporary_password' => $password];
        });
    }

    /**
     * Activates or deactivates a user, audited. Deactivating yourself is
     * never allowed — a tenant with a single admin must not be able to lock
     * itself out.
     */
    public static function setActive(self $user, bool $active, ?self $actor = null): self
    {
        if ($actor !== null && $actor->id === $user->id && ! $active) {
            throw new RuntimeException('A user cannot deactivate their own account.');
        }

        return DB::transaction(function () use ($user, $active, $actor) {
            $user->forceFill(['is_active' => $active])->save();

            AuditLog::record(
                $active ? 'user.reactivated' : 'user.deactivated',
                $actor, $user->tenant_id, 'user', $user->id,
            );

            return $user;
        });
    }
}
