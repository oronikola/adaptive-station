<?php

use App\Http\Controllers\Api\Device\DeviceActivationController;
use App\Http\Controllers\Api\Device\DeviceConfigController;
use App\Http\Controllers\Api\Device\DeviceHeartbeatController;
use App\Http\Controllers\Api\Device\DeviceSessionController;
use App\Http\Controllers\Api\Device\MasterDataFeedController;
use App\Http\Controllers\Api\Device\TapEventBatchController;
use App\Http\Controllers\HealthController;
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
