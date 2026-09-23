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
     * One physical phone per device identity, unlike StationCredential
     * (which deliberately allows several labeled credentials per kiosk) — a
     * gateway phone's login represents "I am this device" to the backend,
     * so a second phone logging in with the same username/password must
     * replace the first, not run alongside it. Without this, two phones
     * could both hold a valid token for the same device_id and both
     * independently claim/send/report under its identity: their combined
     * sent_today is still counted correctly (see SmsGatewayDevice's atomic
     * increment), but if the two phones don't tag every send with a
     * sim_slot identically, the per-SIM breakdown silently falls behind the
     * device-level total — this is what actually happened to a device
     * whose SIM 1 + SIM 2 counts didn't add up to its own aggregate.
     *
     * @return array{token: self, plaintext: string}
     */
    public static function issueFor(SmsGatewayDevice $device, ?Model $actor = null): array
    {
        static::query()
            ->where('device_id', $device->id)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => Date::now()]);

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
