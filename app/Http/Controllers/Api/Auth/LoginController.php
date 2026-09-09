<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ParentAccessToken;
use App\Models\ParentAccount;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceToken;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * One shared login endpoint for the mobile app's two account types: a
 * parent (globally-unique login_id — see ParentAccount::generateLoginId(),
 * which replaced school-code + email login precisely because the same
 * email can legitimately exist at two different schools, making an
 * email-only lookup ambiguous) or a gateway-sender device (admin-chosen
 * username, no school concept at all — a fleet-wide account, see IP-007).
 * Which path handles the request is decided by trying the parent lookup
 * first: login_id and a gateway device's username live in disjoint
 * identifier spaces, so a match either way is decisive — no role selector
 * needed on the shared login screen.
 */
class LoginController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $parent = ParentAccount::allTenants()->where('login_id', trim($data['identifier']))->first();

        if ($parent !== null) {
            return $this->loginParent($request, $data, $parent);
        }

        return $this->loginGatewayDevice($data);
    }

    private function loginParent(Request $request, array $data, ParentAccount $parent): JsonResponse
    {
        $tenant = $parent->tenant;

        if (
            ! $parent->is_active
            || $tenant === null
            || $tenant->status !== TenantStatus::Active
            || ! Hash::check($data['password'], $parent->password)
        ) {
            abort(401, 'Invalid ID or password.');
        }

        app(TenantContext::class)->set($tenant->id);
        TenantDatabase::use($tenant);

        $issued = ParentAccessToken::issueFor($parent, $request->userAgent());

        AuditLog::record('parent.login', $parent, $tenant->id, 'parent_account', $parent->id);

        return response()->json([
            'role' => 'parent',
            'token' => $issued['token'],
            'parent' => [
                'id' => $parent->id,
                'name' => $parent->name,
                'email' => $parent->email,
            ],
        ]);
    }

    private function loginGatewayDevice(array $data): JsonResponse
    {
        $device = SmsGatewayDevice::where('username', $data['identifier'])->first();

        if ($device === null || ! $device->is_active || $device->password === null || ! Hash::check($data['password'], $device->password)) {
            abort(401, 'Invalid ID or password.');
        }

        $issued = SmsGatewayDeviceToken::issueFor($device);

        AuditLog::record('sms_gateway_device.login', null, null, 'sms_gateway_device', $device->id);

        return response()->json([
            'role' => 'gateway_sender',
            'token' => $issued['plaintext'],
            'device' => [
                'id' => $device->id,
                'label' => $device->label,
            ],
        ]);
    }
}
