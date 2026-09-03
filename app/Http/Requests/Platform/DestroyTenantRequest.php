<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * The type-to-confirm UI is a client-side safeguard against misclicks, not
 * the actual security control — a determined or scripted caller could always
 * skip the frontend. This request re-validates the confirmation server-side
 * so the guarantee ("you must know and type this tenant's code") holds
 * regardless of how the request was made.
 */
class DestroyTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('delete', $this->route('tenant'));
    }

    public function rules(): array
    {
        return [
            'confirm_code' => ['required', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $tenant = $this->route('tenant');

            if ($this->input('confirm_code') !== $tenant->code) {
                $validator->errors()->add('confirm_code', 'Type the tenant code exactly to confirm deletion.');
            }
        });
    }
}
