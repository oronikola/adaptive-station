<?php

namespace App\Http\Requests\Platform;

use App\Models\Tenant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Tenant::class);
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

            // Only asked here, not in the tenant's own portal: this is a
            // legacy database credential, and the school's own admin should
            // never be the one supplying (or seeing) essentiel's connection
            // details — that's this platform-level onboarding step's job.
            // required_if_accepted (not required_if:field,1) — the field
            // arrives as a genuine boolean (Inertia posts JSON), and
            // required_if's value-list comparison does not treat `true` as
            // matching the string '1'; required_if_accepted is the rule
            // built specifically for a checkbox-shaped boolean like this.
            'connect_legacy_system' => ['nullable', 'boolean'],
            'legacy_connection' => ['required_if_accepted:connect_legacy_system', 'array'],
            'legacy_connection.host' => ['required_if_accepted:connect_legacy_system', 'string', 'max:255'],
            'legacy_connection.port' => ['nullable', 'integer'],
            'legacy_connection.database' => ['required_if_accepted:connect_legacy_system', 'string', 'max:255'],
            'legacy_connection.username' => ['required_if_accepted:connect_legacy_system', 'string', 'max:255'],
            'legacy_connection.password' => ['required_if_accepted:connect_legacy_system', 'string', 'max:255'],

            // Reference-only, from the school picker (legacySchools()) —
            // never used to actually connect to anything, just stored
            // alongside the real connection details so "which legacy
            // school is this" stays traceable later. All optional: the
            // picker is a convenience, typing the fields above by hand
            // without ever using it is still fully supported.
            'legacy_connection.legacy_school_id' => ['nullable', 'integer'],
            'legacy_connection.legacy_schoolabrv' => ['nullable', 'string', 'max:50'],
            'legacy_connection.eslink' => ['nullable', 'string', 'max:255'],
        ];
    }
}
