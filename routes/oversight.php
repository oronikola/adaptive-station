<?php

use App\Http\Controllers\Oversight\SchoolSelectionController;
use App\Http\Middleware\EnsureOversightAccess;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', EnsureOversightAccess::class])
    ->prefix('oversight')
    ->name('oversight.')
    ->group(function () {
        Route::get('schools', [SchoolSelectionController::class, 'index'])->name('schools.index');
        Route::post('schools/{tenant:code}/select', [SchoolSelectionController::class, 'select'])->name('schools.select');
    });
