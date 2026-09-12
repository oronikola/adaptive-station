<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Support\SmsGatewayFleetSnapshot;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only mirror of Platform\SmsGatewayDeviceController's fleet view, for
 * adaptivestation_admin — the fleet is shared across every school (see
 * IP-007), not owned by whichever one it currently has selected, so this
 * shows the whole fleet regardless of the oversight school-picker's
 * selection. No add/reset-password/deactivate here — those stay exclusive
 * to platform_super_admin. Gated by EnsureOversightAccess (role only, no
 * tenant requirement) rather than EnsurePortalAccess — see routes/portal.php.
 */
class SmsGatewayFleetController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/sms-gateway/devices-screen', SmsGatewayFleetSnapshot::build());
    }
}
