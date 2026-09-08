<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\ParentDeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $parent = $request->attributes->get('parent_account');
        $data = $request->validate([
            'fcm_token' => ['required', 'string', 'max:255'],
            'platform' => ['nullable', 'string', 'max:20'],
        ]);

        ParentDeviceToken::updateOrCreate(
            ['fcm_token' => $data['fcm_token']],
            [
                'tenant_id' => $parent->tenant_id,
                'parent_account_id' => $parent->id,
                'platform' => $data['platform'] ?? null,
            ],
        );

        return response()->json(['message' => 'Device registered for notifications.']);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['fcm_token' => ['required', 'string', 'max:255']]);

        ParentDeviceToken::where('fcm_token', $data['fcm_token'])->delete();

        return response()->json(['message' => 'Device unregistered.']);
    }
}
