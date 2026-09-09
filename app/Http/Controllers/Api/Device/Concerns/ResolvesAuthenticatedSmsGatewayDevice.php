<?php

namespace App\Http\Controllers\Api\Device\Concerns;

use App\Models\SmsGatewayDevice;
use Illuminate\Http\Request;

/**
 * Reads the SmsGatewayDevice bound onto the request by
 * App\Http\Middleware\AuthenticateSmsGatewayDevice, so controllers never
 * re-query.
 */
trait ResolvesAuthenticatedSmsGatewayDevice
{
    protected function smsGatewayDevice(Request $request): SmsGatewayDevice
    {
        return $request->attributes->get('sms_gateway_device');
    }
}
