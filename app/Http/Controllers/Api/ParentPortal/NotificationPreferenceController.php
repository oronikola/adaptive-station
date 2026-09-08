<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    const DEFAULTS = ['notify_in' => true, 'notify_out' => true];

    public function show(Request $request): JsonResponse
    {
        $parent = $request->attributes->get('parent_account');

        return response()->json(['preferences' => $parent->notification_preferences ?? self::DEFAULTS]);
    }

    public function update(Request $request): JsonResponse
    {
        $parent = $request->attributes->get('parent_account');
        $data = $request->validate([
            'notify_in' => ['required', 'boolean'],
            'notify_out' => ['required', 'boolean'],
        ]);

        $parent->forceFill(['notification_preferences' => $data])->save();

        return response()->json(['preferences' => $data]);
    }
}
