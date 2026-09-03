<?php

namespace App\Http\Controllers\Portal;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StoreTenantUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        // User is deliberately not TenantScope'd (see its model docblock) —
        // tenant filtering is this controller's own responsibility.
        $users = User::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/users/users-list-screen', [
            'users' => $users,
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', [User::class, $request->user()->tenant]);

        return Inertia::render('admin/users/users-create-screen');
    }

    public function store(StoreTenantUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        ['temporary_password' => $temporaryPassword] = User::provisionForTenant(
            $request->user()->tenant,
            UserRole::from($data['role']),
            ['name' => $data['name'], 'email' => $data['email']],
            $request->user(),
        );

        return redirect()->route('portal.users.index')
            ->with('success', 'User created.')
            ->with('temporaryPassword', $temporaryPassword);
    }

    public function deactivate(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('delete', $user);

        User::setActive($user, false, $request->user());

        return redirect()->route('portal.users.index')->with('success', 'User deactivated.');
    }

    public function reactivate(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('update', $user);

        User::setActive($user, true, $request->user());

        return redirect()->route('portal.users.index')->with('success', 'User reactivated.');
    }
}
