<?php

use App\Models\ParentAccount;
use Illuminate\Support\Facades\Broadcast;

/**
 * One private channel per parent account — every device that parent is
 * logged in on shares it, since a tap concerns the whole family regardless
 * of which device happens to be watching. $parent is resolved by the
 * 'parent' guard (see AppServiceProvider's Auth::viaRequest registration),
 * not session auth.
 */
Broadcast::channel('parent.{parentAccountId}', function (ParentAccount $parent, string $parentAccountId) {
    return $parent->id === $parentAccountId;
}, ['guards' => ['parent']]);
