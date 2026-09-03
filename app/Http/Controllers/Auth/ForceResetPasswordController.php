<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Forces a user provisioned with a temporary password (see
 * User::provisionTenantAdmin()) to set their own password before reaching
 * anything else in the app — enforced by EnsurePasswordIsCurrent middleware.
 */
class ForceResetPasswordController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('auth/force-reset-password-screen');
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
            'must_reset_password' => false,
        ]);

        return redirect()->route('dashboard');
    }
}
