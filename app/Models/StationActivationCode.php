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

#[Fillable(['tenant_id', 'station_id', 'code_hash', 'expires_at', 'created_by_user_id'])]
#[Hidden(['code_hash'])]
#[ScopedBy(TenantScope::class)]
class StationActivationCode extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    /** Explicit for the same cross-connection-relation reason as Tenant. */
    protected $connection = 'mysql';

    /**
     * Excludes visually ambiguous characters (0/O, 1/I/L) — this code gets
     * read off one screen (the portal) and typed on another (the kiosk's
     * on-screen keyboard), so it must survive that transcription by eye.
     */
    private const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    private const CODE_LENGTH = 10;

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    /**
     * station_activation_codes lives in the central database, same reasoning
     * as StationCredential — its own tenant_id column drives the default
     * HasTenantScope column filter, no override needed.
     */
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
     * first place — deliberately does NOT eager-load `station`, since that
     * model lives on the per-tenant connection and the caller hasn't pointed
     * it at the right tenant's database yet. Callers must read
     * `tenant_id`/`station_id` off the returned row, call
     * App\Support\TenantDatabase::use() for that tenant, and only then query
     * Station separately.
     */
    public static function findValidByPlaintextCode(string $code): ?self
    {
        return static::allTenants()
            ->where('code_hash', hash('sha256', self::normalize($code)))
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
                ->where('code_hash', hash('sha256', self::normalize($plaintextCode)))
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
     * The returned code is formatted for hand-transcription (e.g.
     * "ABCDE-2F3GH"); findValidByPlaintextCode()/redeem() normalize
     * whatever the kiosk submits, so the dash and case are cosmetic only.
     *
     * @return array{activationCode: self, code: string}
     */
    public static function issueFor(Station $station, User $createdBy, ?\DateTimeInterface $expiresAt = null): array
    {
        $code = self::generatePlaintextCode();

        $activationCode = static::allTenants()->create([
            'tenant_id' => $station->tenant_id,
            'station_id' => $station->id,
            'code_hash' => hash('sha256', $code),
            'expires_at' => $expiresAt ?? Date::now()->addHours(24),
            'created_by_user_id' => $createdBy->id,
        ]);

        return ['activationCode' => $activationCode, 'code' => self::format($code)];
    }

    private static function generatePlaintextCode(): string
    {
        $lastIndex = strlen(self::CODE_ALPHABET) - 1;
        $code = '';

        for ($i = 0; $i < self::CODE_LENGTH; $i++) {
            $code .= self::CODE_ALPHABET[random_int(0, $lastIndex)];
        }

        return $code;
    }

    /** Groups the raw code into dash-separated chunks for readability, e.g. "ABCDE-2F3GH". */
    private static function format(string $code): string
    {
        return implode('-', str_split($code, 5));
    }

    /** Undoes formatting/typos: strips everything but letters and digits, then uppercases. */
    private static function normalize(string $code): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
    }
}
