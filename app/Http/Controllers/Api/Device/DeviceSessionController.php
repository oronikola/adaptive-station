<?php

namespace App\Http\Controllers\Api\Device;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedStation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;

/**
 * A lightweight "is my long-lived credential still good" health check — not
 * a token-minting endpoint. All validation already happened in
 * App\Http\Middleware\AuthenticateStation before this controller runs.
 */
class DeviceSessionController extends Controller
{
    use ResolvesAuthenticatedStation;

    public function store(Request $request): JsonResponse
    {
        $station = $this->station($request);

        return response()->json([
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'station_code' => $station->station_code,
            ],
            'server_time' => Date::now()->toIso8601String(),
        ]);
    }
}
