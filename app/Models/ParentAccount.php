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
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

#[Fillable(['tenant_id', 'name', 'email', 'login_id', 'phone_number', 'password', 'password_plaintext', 'is_active', 'notification_preferences'])]
#[Hidden(['password', 'password_plaintext', 'remember_token'])]
#[ScopedBy(TenantScope::class)]
class ParentAccount extends Authenticatable implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    protected $connection = 'mysql';

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            // Recoverable (not just hashed) the same way
            // User::password_plaintext/SmsGatewayDevice::password_plaintext
            // are — see the migration adding this column for why.
            'password_plaintext' => 'encrypted',
            'is_active' => 'boolean',
            'notification_preferences' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Provisions a guardian account with a generated password, mirroring
     * User::provisionForTenant()/SmsGatewayDevice::provision(). Used by the
     * CSV roster importer, which has no human typing in a password for a
     * guardian it just discovered in a spreadsheet row.
     *
     * @return array{account: self, temporary_password: string}
     */
    public static function provision(string $tenantId, array $attributes, ?User $actor = null): array
    {
        $password = $attributes['password'] ?? Str::password(16);
        unset($attributes['password'], $attributes['password_confirmation']);

        return DB::transaction(function () use ($tenantId, $attributes, $password, $actor) {
            $account = static::create([
                ...$attributes,
                'tenant_id' => $tenantId,
                'login_id' => static::generateLoginId($tenantId),
                'password' => $password,
                'password_plaintext' => $password,
                'is_active' => true,
            ]);

            AuditLog::record('parent.created', $actor, $tenantId, 'parent_account', $account->id, ['source' => 'csv_import']);

            return ['account' => $account, 'temporary_password' => $password];
        });
    }

    /**
     * A globally-unique login credential — {TENANT_CODE}{YEAR}{5-digit
     * sequence}, e.g. "ATEST202600001" — that replaces email as how a
     * parent logs in (see the login-id plan: the same email can legitimately
     * exist at two different schools, which makes email-only login
     * ambiguous with no school code; a generated ID sidesteps that
     * entirely). Uniqueness is free because tenants.code is already
     * globally unique; the sequence resets to 1 per tenant per year.
     *
     * insertOrIgnore() + a locked re-select (rather than a plain
     * find-or-create) closes the race where two concurrent callers are both
     * the very first parent created for a given tenant+year: at most one
     * insert wins, and every caller then increments the same locked row.
     */
    public static function generateLoginId(string $tenantId): string
    {
        $tenantCode = Tenant::query()->where('id', $tenantId)->value('code');
        $year = (int) Date::now()->format('Y');

        return DB::connection('mysql')->transaction(function () use ($tenantId, $tenantCode, $year) {
            DB::connection('mysql')->table('parent_login_sequences')->insertOrIgnore([
                'tenant_id' => $tenantId, 'year' => $year, 'next_number' => 1,
                'created_at' => Date::now(), 'updated_at' => Date::now(),
            ]);

            $sequence = DB::connection('mysql')->table('parent_login_sequences')
                ->where('tenant_id', $tenantId)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            DB::connection('mysql')->table('parent_login_sequences')
                ->where('tenant_id', $tenantId)
                ->where('year', $year)
                ->update(['next_number' => $sequence->next_number + 1, 'updated_at' => Date::now()]);

            return sprintf('%s%d%05d', strtoupper((string) $tenantCode), $year, $sequence->next_number);
        });
    }

    public function studentLinks(): HasMany
    {
        return $this->hasMany(ParentStudentLink::class);
    }

    public function accessTokens(): HasMany
    {
        return $this->hasMany(ParentAccessToken::class);
    }

    public function deviceTokens(): HasMany
    {
        return $this->hasMany(ParentDeviceToken::class);
    }

    /**
     * Resolve central link IDs before querying the school's physical database.
     * Callers must establish tenant context/connection first; the scope fails
     * closed otherwise. Recheck active status so a stale account instance cannot
     * preserve access after an administrator deactivates it.
     */
    public function authorizedStudents(): Builder
    {
        $allowed = static::query()->whereKey($this->id)->where('is_active', true)->exists()
            && $this->tenant()->where('status', 'active')->exists();

        return Person::query()
            ->where('tenant_id', $this->tenant_id)
            ->where('person_type', 'student')
            ->where('is_active', true)
            ->whereIn('id', $allowed ? $this->studentLinks()->pluck('person_id')->all() : []);
    }
}
