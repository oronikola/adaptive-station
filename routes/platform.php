<?php

use App\Http\Controllers\Platform\AuditLogController;
use App\Http\Controllers\Platform\DashboardController;
use App\Http\Controllers\Platform\StationController;
use App\Http\Controllers\Platform\TenantController;
use App\Http\Middleware\EnsurePlatformAccess;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', EnsurePlatformAccess::class])
    ->prefix('platform')
    ->name('platform.')
    ->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('tenants', [TenantController::class, 'index'])->name('tenants.index');
        Route::post('tenants', [TenantController::class, 'store'])->name('tenants.store');
        Route::get('tenants/{tenant:code}', [TenantController::class, 'show'])->name('tenants.show');
        Route::patch('tenants/{tenant:code}/status', [TenantController::class, 'updateStatus'])->name('tenants.status');
        Route::post('tenants/{tenant:code}/admins', [TenantController::class, 'storeAdmin'])->name('tenants.admins.store');
        Route::patch('tenants/{tenant:code}/admins/{admin}', [TenantController::class, 'updateAdmin'])->name('tenants.admins.update');
        Route::patch('tenants/{tenant:code}/admins/{admin}/deactivate', [TenantController::class, 'deactivateAdmin'])->name('tenants.admins.deactivate');
        Route::patch('tenants/{tenant:code}/admins/{admin}/reactivate', [TenantController::class, 'reactivateAdmin'])->name('tenants.admins.reactivate');
        Route::delete('tenants/{tenant:code}', [TenantController::class, 'destroy'])->name('tenants.destroy');

        Route::get('stations', [StationController::class, 'index'])->name('stations.index');
        Route::post('stations', [StationController::class, 'store'])->name('stations.store');
        Route::post('stations/{station}/activation-code', [StationController::class, 'issueActivationCode'])
            ->name('stations.activation-code');

        Route::get('audit-log', [AuditLogController::class, 'index'])->name('audit-log.index');
    });
