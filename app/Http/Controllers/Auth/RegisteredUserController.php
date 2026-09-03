<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Adaptive Station has no self-service sign-up: every user is provisioned
     * by a platform or tenant admin with an explicit role and tenant, per the
     * Milestone 1 tenant model. This endpoint intentionally always rejects.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        throw ValidationException::withMessages([
            'email' => 'Self-service registration is not available. Contact your school or platform administrator.',
        ]);
    }
}
