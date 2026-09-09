<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ParentAccessToken;
use App\Models\ParentAccount;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceToken;
use App\Models\Tenant;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * One shared login endpoint for the mobile app's two account types: a
 * parent (needs a school code — parent accounts are only unique per school,
 * see ParentPortal\AuthController) or a gateway-sender device (no school
 * concept at all — a fleet-wide account, see IP-007). Whether `school_code`
 * is present decides which path is attempted, so the app's shared login
 * screen can stay a single form rather than needing a role selector.
 */
class LoginController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_code' => ['nullable', 'string', 'max:100'],
            'identifier' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        if (filled($data['school_code'] ?? null)) {
            return $this->loginParent($request, $data);
        }

        return $this->loginGatewayDevice($data);
    }

    /** Same validation/lookup shape as ParentPortal\AuthController::login(). */
    private function loginParent(Request $request, array $data): JsonResponse
    {
        $tenant = Tenant::where('code', $data['school_code'])->first();
        abort_unless($tenant !== null && $tenant->status === TenantStatus::Active, 401, 'Invalid school code, email, or password.');

        app(TenantContext::class)->set($tenant->id);

        $parent = ParentAccount::where('email', strtolower(trim($data['identifier'])))->first();

        if ($parent === null || ! $parent->is_active || ! Hash::check($data['password'], $parent->password)) {
            abort(401, 'Invalid school code, email, or password.');
        }

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
            abort(401, 'Invalid username or password.');
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
