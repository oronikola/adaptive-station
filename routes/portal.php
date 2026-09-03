<?php

use App\Http\Controllers\Portal\AttendanceController;
use App\Http\Controllers\Portal\ImportBatchController;
use App\Http\Controllers\Portal\ImportExceptionController;
use App\Http\Controllers\Portal\IntegrationProfileController;
use App\Http\Controllers\Portal\PersonController;
use App\Http\Controllers\Portal\RfidCardController;
use App\Http\Controllers\Portal\StationController;
use App\Http\Controllers\Portal\UserController;
use App\Http\Middleware\EnsurePortalAccess;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', EnsurePortalAccess::class])
    ->prefix('portal')
    ->name('portal.')
    ->group(function () {
        Route::get('people', [PersonController::class, 'index'])->name('people.index');
        Route::get('people/create', [PersonController::class, 'create'])->name('people.create');
        Route::post('people', [PersonController::class, 'store'])->name('people.store');
        Route::get('people/{person}/edit', [PersonController::class, 'edit'])->name('people.edit');
        Route::put('people/{person}', [PersonController::class, 'update'])->name('people.update');
        Route::patch('people/{person}/deactivate', [PersonController::class, 'deactivate'])->name('people.deactivate');
        Route::patch('people/{person}/reactivate', [PersonController::class, 'reactivate'])->name('people.reactivate');

        Route::get('rfid-cards', [RfidCardController::class, 'index'])->name('rfid-cards.index');
        Route::post('rfid-cards', [RfidCardController::class, 'store'])->name('rfid-cards.store');
        Route::post('rfid-cards/{rfidCard}/replace', [RfidCardController::class, 'replace'])->name('rfid-cards.replace');
        Route::patch('rfid-cards/{rfidCard}/deactivate', [RfidCardController::class, 'deactivate'])->name('rfid-cards.deactivate');

        Route::get('stations', [StationController::class, 'index'])->name('stations.index');
        Route::get('stations/{station}', [StationController::class, 'show'])->name('stations.show');
        Route::patch('stations/{station}/configuration', [StationController::class, 'updateConfiguration'])
            ->name('stations.configuration');
        Route::post('stations/{station}/credentials', [StationController::class, 'issueCredential'])
            ->name('stations.credentials.store');
        Route::patch('stations/{station}/credentials/{credential}/revoke', [StationController::class, 'revokeCredential'])
            ->name('stations.credentials.revoke');
        Route::post('stations/{station}/activation-code', [StationController::class, 'issueActivationCode'])
            ->name('stations.activation-code');

        Route::get('attendance', [AttendanceController::class, 'index'])->name('attendance.index');
        Route::get('attendance/summary', [AttendanceController::class, 'summary'])->name('attendance.summary');
        Route::get('attendance/export', [AttendanceController::class, 'export'])->name('attendance.export');

        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::get('users/create', [UserController::class, 'create'])->name('users.create');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::patch('users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
        Route::patch('users/{user}/reactivate', [UserController::class, 'reactivate'])->name('users.reactivate');

        Route::get('integrations', [IntegrationProfileController::class, 'index'])->name('integrations.index');
        Route::get('integrations/create', [IntegrationProfileController::class, 'create'])->name('integrations.create');
        Route::post('integrations', [IntegrationProfileController::class, 'store'])->name('integrations.store');
        Route::get('integrations/{profile}/edit', [IntegrationProfileController::class, 'edit'])->name('integrations.edit');
        Route::put('integrations/{profile}', [IntegrationProfileController::class, 'update'])->name('integrations.update');
        Route::post('integrations/{profile}/export', [IntegrationProfileController::class, 'export'])->name('integrations.export');

        Route::get('imports', [ImportBatchController::class, 'index'])->name('imports.index');
        Route::get('imports/create', [ImportBatchController::class, 'create'])->name('imports.create');
        Route::post('imports', [ImportBatchController::class, 'store'])->name('imports.store');
        Route::get('imports/{batch}', [ImportBatchController::class, 'show'])->name('imports.show');
        Route::get('imports/{batch}/exceptions', [ImportExceptionController::class, 'index'])->name('imports.exceptions.index');
        Route::patch('imports/{batch}/exceptions/{exception}/resolve', [ImportExceptionController::class, 'resolve'])->name('imports.exceptions.resolve');
    });
