<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ParentAccessToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * login() used to live here (school_code + email) before the shared
 * Api\Auth\LoginController (login_id + password) replaced it — see the
 * login-id plan. logout() is still the real, in-use endpoint for an
 * already-authenticated parent session.
 */
class AuthController extends Controller
{
    public function logout(Request $request): JsonResponse
    {
        $credential = $request->attributes->get('parent_access_token');
        ParentAccessToken::revoke($credential);

        AuditLog::record('parent.logout', $request->attributes->get('parent_account'), $credential->tenant_id, 'parent_account', $credential->parent_account_id);

        return response()->json(['message' => 'Logged out.']);
    }
}
