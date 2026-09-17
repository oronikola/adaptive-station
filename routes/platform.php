<?php

use App\Http\Controllers\Platform\AuditLogController;
use App\Http\Controllers\Platform\DashboardController;
use App\Http\Controllers\Platform\PlatformAdminController;
use App\Http\Controllers\Platform\SmsDeliveryLogController;
use App\Http\Controllers\Platform\SmsGatewayDeviceController;
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
        // Static segment must be registered before the {tenant:code} wildcard
        // below, or Laravel tries to resolve "legacy-schools" as a tenant code.
        Route::get('tenants/legacy-schools', [TenantController::class, 'legacySchools'])->name('tenants.legacy-schools');
        Route::get('tenants/{tenant:code}', [TenantController::class, 'show'])->name('tenants.show');
        Route::patch('tenants/{tenant:code}', [TenantController::class, 'update'])->name('tenants.update');
        Route::patch('tenants/{tenant:code}/status', [TenantController::class, 'updateStatus'])->name('tenants.status');
        Route::post('tenants/{tenant:code}/admins', [TenantController::class, 'storeAdmin'])->name('tenants.admins.store');
        Route::patch('tenants/{tenant:code}/admins/{admin}', [TenantController::class, 'updateAdmin'])->name('tenants.admins.update');
        Route::patch('tenants/{tenant:code}/admins/{admin}/deactivate', [TenantController::class, 'deactivateAdmin'])->name('tenants.admins.deactivate');
        Route::patch('tenants/{tenant:code}/admins/{admin}/reactivate', [TenantController::class, 'reactivateAdmin'])->name('tenants.admins.reactivate');
        Route::delete('tenants/{tenant:code}', [TenantController::class, 'destroy'])->name('tenants.destroy');

        Route::get('stations', [StationController::class, 'index'])->name('stations.index');
        Route::post('stations', [StationController::class, 'store'])->name('stations.store');
        Route::get('stations/{station}', [StationController::class, 'show'])->name('stations.show');
        Route::patch('stations/{station}/configuration', [StationController::class, 'updateConfiguration'])
            ->name('stations.configuration');
        Route::patch('stations/{station}/rename', [StationController::class, 'rename'])->name('stations.rename');
        Route::post('stations/{station}/credentials', [StationController::class, 'issueCredential'])
            ->name('stations.credentials.store');
        Route::patch('stations/{station}/credentials/{credential}/revoke', [StationController::class, 'revokeCredential'])
            ->name('stations.credentials.revoke');
        Route::post('stations/{station}/activation-code', [StationController::class, 'issueActivationCode'])
            ->name('stations.activation-code');
        Route::post('stations/{station}/pairing-link', [StationController::class, 'issuePairingLink'])
            ->name('stations.pairing-link');
        Route::patch('stations/{station}/retire', [StationController::class, 'retire'])->name('stations.retire');
        Route::patch('stations/{station}/reactivate', [StationController::class, 'reactivate'])->name('stations.reactivate');
        Route::delete('stations/{station}', [StationController::class, 'destroy'])->name('stations.destroy');

        Route::get('sms-gateway/devices', [SmsGatewayDeviceController::class, 'index'])->name('sms-gateway.devices.index');
        Route::post('sms-gateway/devices', [SmsGatewayDeviceController::class, 'store'])->name('sms-gateway.devices.store');
        Route::patch('sms-gateway/devices/{device}/revoke', [SmsGatewayDeviceController::class, 'revoke'])->name('sms-gateway.devices.revoke');
        Route::patch('sms-gateway/devices/{device}/reset-password', [SmsGatewayDeviceController::class, 'resetPassword'])->name('sms-gateway.devices.reset-password');

        Route::get('audit-log', [AuditLogController::class, 'index'])->name('audit-log.index');

        Route::get('sms-log', [SmsDeliveryLogController::class, 'index'])->name('sms-log.index');

        Route::get('platform-admins', [PlatformAdminController::class, 'index'])->name('platform-admins.index');
        Route::post('platform-admins', [PlatformAdminController::class, 'store'])->name('platform-admins.store');
        Route::patch('platform-admins/{admin}/deactivate', [PlatformAdminController::class, 'deactivate'])->name('platform-admins.deactivate');
        Route::patch('platform-admins/{admin}/reactivate', [PlatformAdminController::class, 'reactivate'])->name('platform-admins.reactivate');
    });
