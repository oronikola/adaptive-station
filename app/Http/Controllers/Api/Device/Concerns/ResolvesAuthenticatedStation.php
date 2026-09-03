<?php

namespace App\Http\Controllers\Api\Device\Concerns;

use App\Models\Station;
use App\Models\StationCredential;
use Illuminate\Http\Request;

/**
 * Reads the Station/StationCredential bound onto the request by
 * App\Http\Middleware\AuthenticateStation, so controllers never re-query.
 */
trait ResolvesAuthenticatedStation
{
    protected function station(Request $request): Station
    {
        return $request->attributes->get('device_station');
    }

    protected function credential(Request $request): StationCredential
    {
        return $request->attributes->get('device_credential');
    }
}
