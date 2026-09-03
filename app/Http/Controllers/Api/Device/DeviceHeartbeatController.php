<?php

namespace App\Http\Controllers\Api\Device;

use App\Enums\DeviceHeartbeatStatus;
use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedStation;
use App\Http\Controllers\Controller;
use App\Models\DeviceHeartbeat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Validation\Rule;

class DeviceHeartbeatController extends Controller
{
    use ResolvesAuthenticatedStation;

    public function store(Request $request): JsonResponse
    {
        $station = $this->station($request);

        $data = $request->validate([
            'app_version' => ['nullable', 'string', 'max:50'],
            'pending_event_count' => ['required', 'integer', 'min:0'],
            'status' => ['nullable', Rule::enum(DeviceHeartbeatStatus::class)],
            'last_scan_at' => ['nullable', 'date'],
        ]);

        DeviceHeartbeat::create([
            'tenant_id' => $station->tenant_id,
            'station_id' => $station->id,
            'app_version' => $data['app_version'] ?? null,
            'pending_event_count' => $data['pending_event_count'],
            'status' => $data['status'] ?? DeviceHeartbeatStatus::Online,
            'reported_at' => Date::now(),
        ]);

        // device_heartbeats has no last_scan_at column — that field, if
        // present, is written only to stations.last_scan_at.
        $station->forceFill([
            'last_seen_at' => Date::now(),
            'last_pending_count' => $data['pending_event_count'],
            'app_version' => $data['app_version'] ?? $station->app_version,
            'last_scan_at' => $data['last_scan_at'] ?? $station->last_scan_at,
        ])->save();

        return response()->json([
            'status' => 'ok',
            'received_at' => Date::now()->toIso8601String(),
        ]);
    }
}
