<?php

namespace App\Http\Requests\Platform;

use App\Models\Station;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Station::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // A platform admin creates a station for an arbitrary tenant — the
        // 'tenant' connection has to be pointed at that specific tenant's
        // database before the uniqueness check below queries `stations`
        // there, since a platform request has no tenant of its own to have
        // already switched it via SetTenantContext.
        $tenant = Tenant::find($this->input('tenant_id'));
        if ($tenant !== null) {
            TenantDatabase::use($tenant);
        }

        return [
            'tenant_id' => ['required', 'uuid', Rule::exists('tenants', 'id')],
            'name' => ['required', 'string', 'max:150'],
            'station_code' => [
                'required', 'string', 'max:50',
                Rule::unique('tenant.stations', 'station_code')->where(fn ($query) => $query->where('tenant_id', $this->input('tenant_id'))),
            ],
        ];
    }
}
