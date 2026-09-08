<?php

use App\Http\Controllers\Api\Device\DeviceActivationController;
use App\Http\Controllers\Api\Device\DeviceConfigController;
use App\Http\Controllers\Api\Device\DeviceHeartbeatController;
use App\Http\Controllers\Api\Device\DeviceSessionController;
use App\Http\Controllers\Api\Device\MasterDataFeedController;
use App\Http\Controllers\Api\Device\TapEventBatchController;
use App\Http\Controllers\Api\ParentPortal\AttendanceController as ParentAttendanceController;
use App\Http\Controllers\Api\ParentPortal\AuthController as ParentAuthController;
use App\Http\Controllers\Api\ParentPortal\ChildrenController as ParentChildrenController;
use App\Http\Controllers\Api\ParentPortal\DeviceTokenController as ParentDeviceTokenController;
use App\Http\Controllers\Api\ParentPortal\NotificationPreferenceController as ParentNotificationPreferenceController;
use App\Http\Controllers\HealthController;
use App\Http\Middleware\AuthenticateParent;
use App\Http\Middleware\AuthenticateStation;
use Illuminate\Support\Facades\Route;

Route::get('health', [HealthController::class, 'check'])->name('api.health');

Route::prefix('v1/device')->name('api.device.')->group(function () {
    // No credential exists yet at activation time — not behind AuthenticateStation.
    Route::post('activate', [DeviceActivationController::class, 'store'])->name('activate');

    Route::middleware(AuthenticateStation::class)->group(function () {
        Route::post('session', [DeviceSessionController::class, 'store'])->name('session');
        Route::post('events/batch', [TapEventBatchController::class, 'store'])->name('events.batch');
        Route::get('master-data', [MasterDataFeedController::class, 'index'])->name('master-data');
        Route::post('heartbeat', [DeviceHeartbeatController::class, 'store'])->name('heartbeat');
        Route::get('config', [DeviceConfigController::class, 'show'])->name('config');
    });
});

Route::prefix('v1/parent')->name('api.parent.')->group(function () {
    Route::post('login', [ParentAuthController::class, 'login'])->name('login');

    Route::middleware(AuthenticateParent::class)->group(function () {
        Route::post('logout', [ParentAuthController::class, 'logout'])->name('logout');
        Route::get('children', [ParentChildrenController::class, 'index'])->name('children');
        Route::get('children/{person}/attendance', [ParentAttendanceController::class, 'index'])->name('children.attendance');
        Route::post('device-tokens', [ParentDeviceTokenController::class, 'store'])->name('device-tokens.store');
        Route::delete('device-tokens', [ParentDeviceTokenController::class, 'destroy'])->name('device-tokens.destroy');
        Route::get('notification-preferences', [ParentNotificationPreferenceController::class, 'show'])->name('notification-preferences.show');
        Route::patch('notification-preferences', [ParentNotificationPreferenceController::class, 'update'])->name('notification-preferences.update');
    });
});
