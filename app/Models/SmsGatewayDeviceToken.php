<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV4;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;

/**
 * Bearer credential for one SmsGatewayDevice — split from the device row
 * the same way StationCredential is split from Station, so revoking a lost
 * or factory-reset phone never touches the rest of the fleet or its history.
 */
#[Fillable(['device_id', 'token_hash'])]
#[Hidden(['token_hash'])]
class SmsGatewayDeviceToken extends Model
{
    use HasFactory, HasUuidV4;

    protected $connection = 'mysql';

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(SmsGatewayDevice::class, 'device_id');
    }

    public static function findActiveByPlaintextToken(string $token): ?self
    {
        return static::query()
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')
            ->first();
    }

    /**
     * @return array{token: self, plaintext: string}
     */
    public static function issueFor(SmsGatewayDevice $device, ?Model $actor = null): array
    {
        $plaintext = Str::random(64);

        $token = static::create([
            'device_id' => $device->id,
            'token_hash' => hash('sha256', $plaintext),
        ]);

        AuditLog::record('sms_gateway_device_token.issued', $actor, null, 'sms_gateway_device', $device->id);

        return ['token' => $token, 'plaintext' => $plaintext];
    }

    public static function revoke(self $token, ?User $actor = null): self
    {
        $token->forceFill(['revoked_at' => Date::now()])->save();

        AuditLog::record('sms_gateway_device_token.revoked', $actor, null, 'sms_gateway_device', $token->device_id);

        return $token;
    }
}
