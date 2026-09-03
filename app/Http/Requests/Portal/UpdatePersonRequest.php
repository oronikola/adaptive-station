<?php

namespace App\Http\Requests\Portal;

use App\Enums\PersonType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePersonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('person'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;
        $personId = $this->route('person')->id;

        return [
            'person_type' => ['required', Rule::enum(PersonType::class)],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'display_name' => ['nullable', 'string', 'max:255'],
            'grade_level' => ['nullable', 'string', 'max:100'],
            'section' => ['nullable', 'string', 'max:100'],
            'photo_url' => ['nullable', 'url', 'max:2048'],
            'external_id' => [
                'nullable', 'string', 'max:100',
                Rule::unique('people')->where(fn ($query) => $query->where('tenant_id', $tenantId))->ignore($personId),
            ],
        ];
    }
}
