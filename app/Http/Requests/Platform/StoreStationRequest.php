<?php

namespace App\Http\Requests\Platform;

use App\Models\Station;
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
        return [
            'tenant_id' => ['required', 'uuid', Rule::exists('tenants', 'id')],
            'name' => ['required', 'string', 'max:150'],
            'station_code' => [
                'required', 'string', 'max:50',
                Rule::unique('stations', 'station_code')->where(fn ($query) => $query->where('tenant_id', $this->input('tenant_id'))),
            ],
        ];
    }
}
