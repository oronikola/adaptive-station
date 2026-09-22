<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV4;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * One physical dual-SIM phone in the SMS gateway fleet. Deliberately not
 * TenantScoped — a device serves every tenant's pending sms_outbox rows
 * from one shared pool, never assigned to a single school. See IP-007.
 *
 * A gateway-sender "account" (username + password), the same shape as a
 * parent/staff login — the phone itself logs in via the app's shared login
 * screen and gets a fresh SmsGatewayDeviceToken back, rather than an admin
 * hand-issuing a long-lived token to paste in.
 */
#[Fillable(['label', 'is_active', 'username', 'password', 'password_plaintext'])]
#[Hidden(['password', 'password_plaintext'])]
class SmsGatewayDevice extends Model
{
    use HasFactory, HasUuidV4;

    protected $connection = 'mysql';

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_seen_at' => 'datetime',
            'stats_date' => 'date',
            'password' => 'hashed',
            // Recoverable (not just hashed) the same way User::password_plaintext
            // is — a device's password is typed into a phone once at setup,
            // not memorised by a person, so an admin must be able to reveal
            // it again later rather than only via a one-time flash.
            'password_plaintext' => 'encrypted',
        ];
    }

    /**
     * Provisions a gateway-sender account, mirroring
     * User::provisionForTenant()'s password-generation/recoverability
     * pattern. $attributes may supply its own 'password' (e.g. to hand the
     * device straight to whoever is setting up the phone); otherwise one is
     * generated.
     *
     * @return array{device: self, temporary_password: string}
     */
    public static function provision(array $attributes, ?User $actor = null): array
    {
        $password = $attributes['password'] ?? Str::password(16);
        unset($attributes['password'], $attributes['password_confirmation']);

        return DB::transaction(function () use ($attributes, $password, $actor) {
            $device = static::create([
                ...$attributes,
                'password' => $password,
                'password_plaintext' => $password,
                'is_active' => true,
            ]);

            AuditLog::record('sms_gateway_device.created', $actor, null, 'sms_gateway_device', $device->id);

            return ['device' => $device, 'temporary_password' => $password];
        });
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(SmsGatewayDeviceToken::class, 'device_id');
    }

    public function outboxMessages(): HasMany
    {
        return $this->hasMany(SmsOutboxMessage::class, 'claimed_by_device_id');
    }

    public function simStats(): HasMany
    {
        return $this->hasMany(SmsGatewayDeviceSimStat::class, 'device_id');
    }

    public function simStatuses(): HasMany
    {
        return $this->hasMany(SmsGatewayDeviceSimStatus::class, 'device_id');
    }

    /** A legacy gateway without status reports remains eligible until it upgrades. */
    public function canClaimSmsFor(?int $simSlot): bool
    {
        if ($simSlot !== null) {
            return $this->simStatuses()->where('sim_slot', $simSlot)->first()?->canSend() ?? true;
        }

        $statuses = $this->simStatuses()->get();

        return $statuses->isEmpty() || $statuses->contains(fn (SmsGatewayDeviceSimStatus $status) => $status->canSend());
    }

    /**
     * 'ok' / 'near' (>=80% of the researched daily cap) / 'at' (>=100%) —
     * purely informational (see config('services.sms_gateway.
     * daily_send_cap')'s docblock), computed from this device's own
     * aggregate sent_today, not broken down per SIM. Use
     * SmsGatewayDeviceSimStat::capStatus() for the per-SIM version.
     */
    public function dailySendCapStatus(): string
    {
        return static::capStatusFor($this->sent_today);
    }

    public static function capStatusFor(int $sentToday): string
    {
        $cap = config('services.sms_gateway.daily_send_cap');

        return match (true) {
            $sentToday >= $cap => 'at',
            $sentToday >= $cap * 0.8 => 'near',
            default => 'ok',
        };
    }

    public static function currentStatsDate(): string
    {
        return Date::now()
            ->setTimezone((string) config('services.sms_gateway.timezone'))
            ->toDateString();
    }

    /**
     * Rolls sent_today/delivered_today/failed_today over when the calendar
     * day changes, checked on every claim poll — avoids a separate
     * scheduled reset job for counters that only matter for the portal's
     * fleet-health view.
     */
    public function resetDailyStatsIfNeeded(): self
    {
        $today = static::currentStatsDate();

        if ($this->stats_date?->toDateString() !== $today) {
            $this->forceFill([
                'sent_today' => 0,
                'delivered_today' => 0,
                'failed_today' => 0,
                'stats_date' => $today,
            ]);
        }

        return $this;
    }
}
