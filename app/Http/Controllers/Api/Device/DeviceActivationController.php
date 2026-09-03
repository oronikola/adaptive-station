<?php

namespace App\Http\Controllers\Api\Device;

use App\Enums\StationStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\StationCredential;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeviceActivationController extends Controller
{
    /**
     * Exchanges a one-time activation code for a long-lived station
     * credential — the only way a kiosk ever obtains its first bearer token,
     * since there is no separate "session mints a token" flow in this MVP
     * (see ADR-003/ADR-004 and the device-auth design decision).
     *
     * Spans two physically separate databases (central: activation code +
     * new credential + audit log; tenant: the station row itself), so it
     * cannot be one atomic transaction — redeem() already committed the code
     * as consumed by the time the station update runs. A crash in between
     * would leave the code consumed but the station not yet activated;
     * support re-issues a fresh code in that rare case.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'activation_code' => ['required', 'string'],
        ]);

        $activationCode = StationActivationCode::redeem($data['activation_code']);
        abort_if($activationCode === null, 401, 'Invalid or expired activation code.');

        $tenant = Tenant::findOrFail($activationCode->tenant_id);
        TenantDatabase::use($tenant);

        return DB::connection('tenant')->transaction(function () use ($activationCode) {
            $station = Station::allTenants()->findOrFail($activationCode->station_id);
            abort_if($station->status !== StationStatus::PendingActivation, 409, 'Station is already activated.');

            $station->forceFill(['status' => StationStatus::Active])->save();

            ['credential' => $credential, 'token' => $token] = StationCredential::issueFor(
                $station,
                label: 'Activated '.now()->toDateString(),
                actor: $station,
            );

            AuditLog::record('station.activated', $station, $station->tenant_id, 'Station', $station->id, [
                'activation_code_id' => $activationCode->id,
                'issued_by_user_id' => $activationCode->created_by_user_id,
                'station_credential_id' => $credential->id,
            ]);

            return response()->json([
                'station' => [
                    'id' => $station->id,
                    'name' => $station->name,
                    'station_code' => $station->station_code,
                ],
                'credential_token' => $token,
            ], 201);
        });
    }
}
