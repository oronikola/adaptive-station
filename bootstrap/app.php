<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
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
            remove: [\Illuminate\Routing\Middleware\SubstituteBindings::class],
            append: [
                \App\Http\Middleware\HandleInertiaRequests::class,
                \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
                \App\Http\Middleware\SetTenantContext::class,
                \Illuminate\Routing\Middleware\SubstituteBindings::class,
            ],
        );

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
