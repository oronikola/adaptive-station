<?php

namespace App\Http\Controllers\Api\Device;

use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedStation;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Deliberately minimal — real configurable kiosk display/behavior content is
 * Milestone 3/4 portal work. This just plumbs through the station's existing
 * `configuration` JSON column and a couple of tenant-level settings.
 */
class DeviceConfigController extends Controller
{
    use ResolvesAuthenticatedStation;

    public function show(Request $request): JsonResponse
    {
        $station = $this->station($request);
        $tenant = $station->tenant;

        return response()->json([
            'station' => [
                'id' => $station->id,
                'name' => $station->name,
                'station_code' => $station->station_code,
                'configuration' => $station->configuration ?? [],
            ],
            'tenant' => [
                'id' => $tenant->id,
                'timezone' => $tenant->timezone,
                'attendance_policy' => $tenant->attendance_policy,
            ],
        ]);
    }
}
