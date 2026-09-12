<?php

namespace App\Http\Controllers\Platform;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StorePlatformAdminRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Manages adaptivestation_admin accounts — the read-only, platform-wide
 * oversight role (see UserRole::AdaptivestationAdmin). Exclusive to
 * PlatformSuperAdmin: this screen provisions/deactivates staff accounts,
 * which is itself a write action the oversight role must never reach.
 */
class PlatformAdminController extends Controller
{
    public function index(Request $request): Response
    {
        // UserPolicy::viewAny() is deliberately permissive (any authenticated
        // user can view *some* users) — that's the wrong check here, since
        // this specific screen provisions platform staff accounts and must
        // stay exclusive to PlatformSuperAdmin, same as its create/delete/
        // update actions below.
        abort_unless($request->user()->isPlatformSuperAdmin(), 403);

        $admins = User::query()
            ->where('role', UserRole::AdaptivestationAdmin)
            ->orderBy('name')
            ->get()
            ->makeVisible('password_plaintext');

        return Inertia::render('Platform/platform-admins/platform-admins-list-screen', [
            'admins' => $admins,
        ]);
    }

    public function store(StorePlatformAdminRequest $request): RedirectResponse
    {
        ['user' => $admin] = User::provisionPlatformAdmin($request->validated(), $request->user());

        return redirect()->route('platform.platform-admins.index')
            ->with('success', "Admin account \"{$admin->name}\" created.");
    }

    public function deactivate(Request $request, User $admin): RedirectResponse
    {
        Gate::authorize('delete', $admin);
        abort_unless($admin->role === UserRole::AdaptivestationAdmin, 404);

        User::setActive($admin, false, $request->user());

        return redirect()->route('platform.platform-admins.index')->with('success', 'Admin account deactivated.');
    }

    public function reactivate(Request $request, User $admin): RedirectResponse
    {
        Gate::authorize('update', $admin);
        abort_unless($admin->role === UserRole::AdaptivestationAdmin, 404);

        User::setActive($admin, true, $request->user());

        return redirect()->route('platform.platform-admins.index')->with('success', 'Admin account reactivated.');
    }
}
