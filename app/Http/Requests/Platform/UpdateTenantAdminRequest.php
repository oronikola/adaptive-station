<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTenantAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('admin'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            // users.email is unique platform-wide, not per tenant.
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('admin'))],
        ];
    }
}
