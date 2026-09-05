<?php

namespace App\Http\Requests\Platform;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [User::class, $this->route('tenant')]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            // users.email is unique platform-wide, not per tenant.
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            // No password field here — User::provisionForTenant() always
            // generates one when 'password' is absent, revealable anytime
            // from the Admin Users table (see users.password_plaintext).
        ];
    }
}
