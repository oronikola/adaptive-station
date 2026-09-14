<?php

use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Device\DeviceActivationController;
use App\Http\Controllers\Api\Device\DeviceConfigController;
use App\Http\Controllers\Api\Device\DeviceHeartbeatController;
use App\Http\Controllers\Api\Device\DeviceSessionController;
use App\Http\Controllers\Api\Device\MasterDataFeedController;
use App\Http\Controllers\Api\Device\SmsGatewayController;
use App\Http\Controllers\Api\Device\TapEventBatchController;
use App\Http\Controllers\Api\Device\TapEventResolveController;
use App\Http\Controllers\Api\ParentPortal\AttendanceController as ParentAttendanceController;
use App\Http\Controllers\Api\ParentPortal\AuthController as ParentAuthController;
use App\Http\Controllers\Api\ParentPortal\ChildrenController as ParentChildrenController;
use App\Http\Controllers\Api\ParentPortal\DeviceTokenController as ParentDeviceTokenController;
use App\Http\Controllers\Api\ParentPortal\NotificationPreferenceController as ParentNotificationPreferenceController;
use App\Http\Controllers\HealthController;
use App\Http\Middleware\AuthenticateParent;
use App\Http\Middleware\AuthenticateSmsGatewayDevice;
use App\Http\Middleware\AuthenticateStation;
use Illuminate\Support\Facades\Route;

Route::get('health', [HealthController::class, 'check'])->name('api.health');

// One shared login for the mobile app's two account types (parent vs
// gateway-sender device) — see LoginController's docblock.
Route::post('v1/auth/login', [LoginController::class, 'login'])->name('api.auth.login');

Route::prefix('v1/device')->name('api.device.')->group(function () {
    // No credential exists yet at activation time — not behind AuthenticateStation.
    Route::post('activate', [DeviceActivationController::class, 'store'])->name('activate');

    Route::middleware(AuthenticateStation::class)->group(function () {
        Route::post('session', [DeviceSessionController::class, 'store'])->name('session');
        Route::post('events/batch', [TapEventBatchController::class, 'store'])->name('events.batch');
        // The kiosk's "this card isn't in my local cache" fallback — see
        // TapEventResolveController's docblock. Distinct from events.batch:
        // this one waits for and returns essentiel's resolution instead of
        // uploading fire-and-forget.
        Route::post('taps/resolve', [TapEventResolveController::class, 'store'])->name('taps.resolve');
        Route::get('master-data', [MasterDataFeedController::class, 'index'])->name('master-data');
        Route::post('heartbeat', [DeviceHeartbeatController::class, 'store'])->name('heartbeat');
        Route::get('config', [DeviceConfigController::class, 'show'])->name('config');
    });
});

// A distinct device class from v1/device above — an SMS gateway phone isn't
// tenant-scoped (see AuthenticateSmsGatewayDevice), it claims sms_outbox
// rows across every tenant from one shared pool.
Route::prefix('v1/device/sms')->name('api.device.sms.')->middleware(AuthenticateSmsGatewayDevice::class)->group(function () {
    Route::post('logout', [SmsGatewayController::class, 'logout'])->name('logout');
    Route::post('claim', [SmsGatewayController::class, 'claim'])->name('claim');
    Route::post('messages/{message}/status', [SmsGatewayController::class, 'reportStatus'])->name('messages.status');
});

Route::prefix('v1/parent')->name('api.parent.')->group(function () {
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
