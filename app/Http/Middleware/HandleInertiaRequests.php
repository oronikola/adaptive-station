<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $tenantId = $request->user()?->tenant_id;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            // Kept separate from auth.user (not nested) since
            // platform_super_admin has a null tenant_id, and a future
            // platform layout needs a null-safe shared prop at this shape.
            'tenant' => $tenantId !== null
                ? Tenant::select(['id', 'name', 'code', 'timezone'])->find($tenantId)
                : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                // Read by the global toast system (ToastProvider) so any
                // controller can flash a failure without wiring a toast
                // per screen: return ...->with('error', 'message').
                'error' => fn () => $request->session()->get('error'),
                // One-time secrets (temp password, activation code) — shown
                // exactly once on the next page load, never persisted beyond
                // the flashed session value itself.
                'temporaryPassword' => fn () => $request->session()->get('temporaryPassword'),
                'activationCode' => fn () => $request->session()->get('activationCode'),
                'deviceToken' => fn () => $request->session()->get('deviceToken'),
            ],
        ];
    }
}
