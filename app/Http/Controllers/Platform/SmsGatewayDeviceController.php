<?php

namespace App\Http\Controllers\Platform;

use App\Enums\SmsOutboxStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceToken;
use App\Models\SmsOutboxMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Fleet roster + backlog visibility for the SMS gateway phones. Deliberately
 * lightweight (a glance, not a monitoring stack) — see IP-007.
 */
class SmsGatewayDeviceController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', SmsGatewayDevice::class);

        $staleThreshold = Date::now()->subMinutes(3);

        $devices = SmsGatewayDevice::query()
            ->orderBy('label')
            ->get()
            ->map(fn (SmsGatewayDevice $device) => [
                'id' => $device->id,
                'label' => $device->label,
                'username' => $device->username,
                'is_active' => $device->is_active,
                'last_seen_at' => $device->last_seen_at?->toIso8601String(),
                'sent_today' => $device->sent_today,
                'delivered_today' => $device->delivered_today,
                'failed_today' => $device->failed_today,
                'is_stale' => $device->last_seen_at === null || $device->last_seen_at->lt($staleThreshold),
            ]);

        $backlog = [
            'pending' => SmsOutboxMessage::query()->where('status', SmsOutboxStatus::Pending->value)->count(),
            'claimed' => SmsOutboxMessage::query()->where('status', SmsOutboxStatus::Claimed->value)->count(),
            'failed_last_24h' => SmsOutboxMessage::query()
                ->where('status', SmsOutboxStatus::Failed->value)
                ->where('created_at', '>', Date::now()->subDay())
                ->count(),
            'oldest_pending_age_seconds' => $this->oldestPendingAgeSeconds(),
        ];

        return Inertia::render('Platform/sms-gateway/devices-screen', [
            'devices' => $devices,
            'backlog' => $backlog,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', SmsGatewayDevice::class);

        $data = $request->validate([
            'label' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:mysql.sms_gateway_devices,username'],
            'password' => ['nullable', 'string', 'min:8', 'max:100'],
        ]);

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        ['device' => $device, 'temporary_password' => $password] = SmsGatewayDevice::provision($data, $request->user());

        return redirect()->route('platform.sms-gateway.devices.index')
            ->with('success', "Device \"{$device->label}\" added.")
            ->with('deviceUsername', $device->username)
            ->with('devicePassword', $password);
    }

    /**
     * Regenerates a device's password without touching its username or
     * active status — for a phone that needs re-entering its credentials
     * (e.g. after a factory reset) without losing its send history/stats.
     */
    public function resetPassword(Request $request, SmsGatewayDevice $device): RedirectResponse
    {
        Gate::authorize('update', $device);

        $data = $request->validate([
            'password' => ['nullable', 'string', 'min:8', 'max:100'],
        ]);

        $password = $data['password'] ?? Str::password(16);
        $device->forceFill(['password' => $password, 'password_plaintext' => $password])->save();

        AuditLog::record('sms_gateway_device.password_reset', $request->user(), null, 'sms_gateway_device', $device->id);

        return redirect()->route('platform.sms-gateway.devices.index')
            ->with('success', "Password reset for \"{$device->label}\".")
            ->with('deviceUsername', $device->username)
            ->with('devicePassword', $password);
    }

    public function revoke(Request $request, SmsGatewayDevice $device): RedirectResponse
    {
        Gate::authorize('update', $device);

        $token = $device->tokens()->whereNull('revoked_at')->first();
        if ($token !== null) {
            SmsGatewayDeviceToken::revoke($token, $request->user());
        }

        $device->forceFill(['is_active' => false])->save();

        return redirect()->route('platform.sms-gateway.devices.index')
            ->with('success', "Device \"{$device->label}\" deactivated.");
    }

    private function oldestPendingAgeSeconds(): int
    {
        $oldest = SmsOutboxMessage::query()
            ->where('status', SmsOutboxStatus::Pending->value)
            ->min('created_at');

        return $oldest === null ? 0 : Date::now()->diffInSeconds(Date::parse($oldest));
    }
}
