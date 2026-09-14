<?php

use App\Http\Controllers\Platform\AuditLogController;
use App\Http\Controllers\Platform\OverviewController;
use App\Http\Controllers\Platform\StationController;
use App\Http\Controllers\Platform\TenantController;
use App\Http\Middleware\EnsurePlatformAccess;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', EnsurePlatformAccess::class])
    ->prefix('platform')
    ->name('platform.')
    ->group(function () {
        Route::get('overview', [OverviewController::class, 'index'])->name('overview.index');

        Route::get('tenants', [TenantController::class, 'index'])->name('tenants.index');
        Route::post('tenants', [TenantController::class, 'store'])->name('tenants.store');
        Route::get('tenants/{tenant}', [TenantController::class, 'show'])->name('tenants.show');
        Route::patch('tenants/{tenant}', [TenantController::class, 'update'])->name('tenants.update');
        Route::patch('tenants/{tenant}/status', [TenantController::class, 'updateStatus'])->name('tenants.status');
        Route::post('tenants/{tenant}/admins', [TenantController::class, 'storeAdmin'])->name('tenants.admins.store');
        Route::delete('tenants/{tenant}', [TenantController::class, 'destroy'])->name('tenants.destroy');

        Route::get('stations', [StationController::class, 'index'])->name('stations.index');
        Route::post('stations', [StationController::class, 'store'])->name('stations.store');
        Route::get('stations/{station}', [StationController::class, 'show'])->name('stations.show');
        Route::patch('stations/{station}/configuration', [StationController::class, 'updateConfiguration'])
            ->name('stations.configuration');
        Route::post('stations/{station}/credentials', [StationController::class, 'issueCredential'])
            ->name('stations.credentials.store');
        Route::patch('stations/{station}/credentials/{credential}/revoke', [StationController::class, 'revokeCredential'])
            ->name('stations.credentials.revoke');
        Route::post('stations/{station}/activation-code', [StationController::class, 'issueActivationCode'])
            ->name('stations.activation-code');

        Route::get('audit-log', [AuditLogController::class, 'index'])->name('audit-log.index');
    });
