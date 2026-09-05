<?php

use App\Http\Controllers\KioskController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Landing/LandingPage');
})->name('home');

Route::get('/landing', function () {
    return Inertia::render('Landing/LandingPage');
})->name('landing');

Route::get('/kiosk', [KioskController::class, 'show'])->name('kiosk');

// A gateway, not a page: every login/verification/password-confirmation flow
// redirects here (route('dashboard')), so this is the single place that
// routes a freshly authenticated user to their actual portal by role,
// rather than rendering the stock Breeze scaffold page.
Route::get('/dashboard', function () {
    $user = request()->user();

    if ($user->isPlatformSuperAdmin()) {
        return redirect()->route('platform.dashboard');
    }

    return redirect()->route('portal.dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/portal.php';
require __DIR__.'/platform.php';
require __DIR__.'/auth.php';
