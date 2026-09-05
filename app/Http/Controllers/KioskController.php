<?php

namespace App\Http\Controllers;

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
    public function show(): Response
    {
        return Inertia::render('Kiosk/kiosk-screen');
    }
}
