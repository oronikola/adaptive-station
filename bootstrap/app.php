<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetTenantContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // Registered separately (not via withRouting's `channels:` param) so the
    // auth endpoint lands at api/v1/parent/broadcasting/auth behind the
    // parent-token guard, matching the rest of the parent API, instead of
    // the framework's session-based 'web' guard default.
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api/v1/parent', 'middleware' => ['auth:parent']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->throttleApi();

        // SetTenantContext must run before SubstituteBindings, otherwise implicit
        // route-model binding on tenant-scoped models resolves with no tenant
        // context yet set, and TenantScope's fail-closed default 404s every
        // request — including the owning tenant's own requests. The default
        // 'web' group appends SubstituteBindings before any custom middleware,
        // so it is removed here and re-appended after SetTenantContext.
        $middleware->web(
            remove: [SubstituteBindings::class],
            append: [
                HandleInertiaRequests::class,
                AddLinkHeadersForPreloadedAssets::class,
                SetTenantContext::class,
                SubstituteBindings::class,
            ],
        );

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
