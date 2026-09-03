<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// A gateway, not a page: every login/verification/password-confirmation flow
// redirects here (route('dashboard')), so this is the single place that
// routes a freshly authenticated user to their actual portal by role,
// rather than rendering the stock Breeze scaffold page.
Route::get('/dashboard', function () {
    $user = request()->user();

    if ($user->isPlatformSuperAdmin()) {
        return redirect()->route('platform.tenants.index');
    }

    return redirect()->route('portal.people.index');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/portal.php';
require __DIR__.'/platform.php';
require __DIR__.'/auth.php';
