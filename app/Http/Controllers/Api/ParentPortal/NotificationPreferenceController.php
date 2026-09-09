<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    // notify_sms defaults false — opt-in, since SMS costs money per message
    // unlike push. See IP-007.
    const DEFAULTS = ['notify_in' => true, 'notify_out' => true, 'notify_sms' => false];

    public function show(Request $request): JsonResponse
    {
        $parent = $request->attributes->get('parent_account');

        return response()->json([
            'preferences' => array_merge(self::DEFAULTS, $parent->notification_preferences ?? []),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $parent = $request->attributes->get('parent_account');
        $data = $request->validate([
            'notify_in' => ['required', 'boolean'],
            'notify_out' => ['required', 'boolean'],
            // Optional so existing app versions that don't send it yet
            // don't accidentally wipe a previously-set value below.
            'notify_sms' => ['sometimes', 'boolean'],
        ]);

        $merged = array_merge(self::DEFAULTS, $parent->notification_preferences ?? [], $data);
        $parent->forceFill(['notification_preferences' => $merged])->save();

        return response()->json(['preferences' => $merged]);
    }
}
