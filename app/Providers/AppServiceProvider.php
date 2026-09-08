<?php

namespace App\Providers;

use App\Models\ParentAccessToken;
use App\Support\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Backs bootstrap/app.php's throttleApi() call for routes/api.php
        // (the device API) — keyed by device credential/IP since device
        // requests have no session-authenticated user.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->bearerToken() ?? $request->ip());
        });

        // Lets Broadcast::routes()'s auth endpoint (registered under
        // api/v1/parent, see bootstrap/app.php) authenticate a parent
        // mobile-app request the same bearer-token way the rest of the
        // parent API does, instead of the session-based 'web' guard
        // broadcasting auth normally expects.
        Auth::viaRequest('parent-token', fn (Request $request) => ParentAccessToken::authenticate($request->bearerToken())['parent'] ?? null);
    }
}
