<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Tenant::class);
    }

    /**
     * Normalizes the code to a clean slug (e.g. "CNHS" / "C N H S" -> "cnhs")
     * before validation, so uniqueness and format checks apply to the same
     * value that ends up stored — the operator doesn't need to know the
     * slug convention themselves.
     */
    protected function prepareForValidation(): void
    {
        if ($this->filled('code')) {
            $this->merge(['code' => Str::slug($this->input('code'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'code' => ['required', 'string', 'max:50', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/', Rule::unique('tenants', 'code')],
            'timezone' => ['required', 'string', Rule::in(timezone_identifiers_list())],
        ];
    }
}
