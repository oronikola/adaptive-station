<?php

namespace App\Http\Controllers;

use App\Models\Station;
use App\Models\StationPairingToken;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The physical tap-in/tap-out kiosk screen. Deliberately public (no auth
 * middleware) — a kiosk isn't a logged-in portal user, it authenticates
 * itself against the v1/device API (routes/api.php) entirely client-side,
 * using a bearer token it stores locally after activation. See the device
 * API controllers under App\Http\Controllers\Api\Device for the backend
 * half of this: activation, master-data sync, batched tap upload, heartbeat.
 */
class KioskController extends Controller
{
    public function show(?string $pairingToken = null): Response
    {
        return Inertia::render('Kiosk/kiosk-screen', [
            'pairingToken' => $pairingToken,
            'stationName' => $pairingToken !== null ? $this->resolveStationName($pairingToken) : null,
        ]);
    }

    /**
     * A read-only lookup, deliberately not StationPairingToken::redeem() —
     * this only labels the page while it's still on the "Pairing…" screen
     * (so whoever opened the link/QR can confirm it's the right station
     * before/while the actual device/pair exchange happens), it never
     * consumes or mutates the token itself.
     */
    private function resolveStationName(string $pairingToken): ?string
    {
        $token = StationPairingToken::findActiveByPlaintextToken($pairingToken);
        if ($token === null) {
            return null;
        }

        $tenant = Tenant::find($token->tenant_id);
        if ($tenant === null) {
            return null;
        }

        TenantDatabase::use($tenant);

        return Station::allTenants()->find($token->station_id)?->name;
    }
}
