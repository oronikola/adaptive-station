<?php

namespace App\Http\Middleware;

use App\Models\SmsGatewayDeviceToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates an SMS gateway phone using its long-lived device token as a
 * bearer token — same idiom as AuthenticateStation, but deliberately does
 * NOT call TenantDatabase::use(): this device class isn't bound to a single
 * tenant, it claims sms_outbox rows across every tenant from one shared
 * pool (see IP-007's fix for the essentiel.ph per-school bottleneck).
 */
class AuthenticateSmsGatewayDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        abort_unless($token !== null, 401, 'Missing device credential.');

        $credential = SmsGatewayDeviceToken::findActiveByPlaintextToken($token);
        abort_unless($credential !== null, 401, 'Invalid or revoked device credential.');

        $device = $credential->device;
        abort_unless($device?->is_active, 403, 'Device is not active.');

        $credential->forceFill(['last_used_at' => Date::now()])->save();
        $device->forceFill(['last_seen_at' => Date::now()])->save();

        $request->attributes->set('sms_gateway_device', $device);
        $request->attributes->set('sms_gateway_credential', $credential);

        return $next($request);
    }
}
