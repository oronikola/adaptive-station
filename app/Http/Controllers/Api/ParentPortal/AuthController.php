<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Enums\TenantStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ParentAccessToken;
use App\Models\ParentAccount;
use App\Models\Tenant;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Parent accounts are only unique per school (see
     * SaveParentAccountRequest), so login needs the school code alongside
     * the credentials — there is no way to resolve a tenant from an email
     * address alone. The same generic message is used for an unknown school
     * code, unknown email, wrong password, or inactive account, so a caller
     * can't use this endpoint to enumerate which of those is the case.
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_code' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $tenant = Tenant::where('code', $data['school_code'])->first();
        abort_unless($tenant !== null && $tenant->status === TenantStatus::Active, 401, 'Invalid school code, email, or password.');

        app(TenantContext::class)->set($tenant->id);

        $parent = ParentAccount::where('email', strtolower(trim($data['email'])))->first();

        if ($parent === null || ! $parent->is_active || ! Hash::check($data['password'], $parent->password)) {
            abort(401, 'Invalid school code, email, or password.');
        }

        TenantDatabase::use($tenant);

        $issued = ParentAccessToken::issueFor($parent, $request->userAgent());

        AuditLog::record('parent.login', $parent, $tenant->id, 'parent_account', $parent->id);

        return response()->json([
            'token' => $issued['token'],
            'parent' => [
                'id' => $parent->id,
                'name' => $parent->name,
                'email' => $parent->email,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $credential = $request->attributes->get('parent_access_token');
        ParentAccessToken::revoke($credential);

        AuditLog::record('parent.logout', $request->attributes->get('parent_account'), $credential->tenant_id, 'parent_account', $credential->parent_account_id);

        return response()->json(['message' => 'Logged out.']);
    }
}
