<?php

namespace App\Http\Controllers\Api\Device;

use App\Enums\StationStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Station;
use App\Models\StationCredential;
use App\Models\StationPairingToken;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DevicePairingController extends Controller
{
    /**
     * Exchanges a station's pairing-link token for a fresh device
     * credential — the link/QR equivalent of DeviceActivationController's
     * typed-code flow. Unlike that flow, the token isn't single-use: this
     * redeems successfully every time the kiosk (re-)opens the link, which
     * is what lets a kiosk that lost its local IndexedDB credential re-pair
     * itself from the same printed QR code rather than needing a portal
     * admin to issue anything new. A brand-new credential is minted on every
     * call regardless — cheap, and keeps this endpoint idempotent from the
     * kiosk's point of view rather than needing to special-case "already
     * paired".
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pairing_token' => ['required', 'string'],
        ]);

        $pairingToken = StationPairingToken::redeem($data['pairing_token']);
        abort_if($pairingToken === null, 401, 'Invalid or revoked pairing link.');

        $tenant = Tenant::findOrFail($pairingToken->tenant_id);
        TenantDatabase::use($tenant);

        return DB::connection('tenant')->transaction(function () use ($pairingToken) {
            $station = Station::allTenants()->findOrFail($pairingToken->station_id);
            abort_if(
                in_array($station->status, [StationStatus::Disabled, StationStatus::Retired], true),
                409,
                'Station is not available for pairing.',
            );

            $wasPending = $station->status === StationStatus::PendingActivation;
            if ($wasPending) {
                $station->forceFill(['status' => StationStatus::Active])->save();
            }

            ['credential' => $credential, 'token' => $token] = StationCredential::issueFor(
                $station,
                label: 'Paired via link '.now()->toDateString(),
                actor: $station,
            );

            AuditLog::record(
                $wasPending ? 'station.activated_via_link' : 'station.repaired_via_link',
                $station,
                $station->tenant_id,
                'station',
                $station->id,
                [
                    'station_pairing_token_id' => $pairingToken->id,
                    'station_credential_id' => $credential->id,
                ],
            );

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
