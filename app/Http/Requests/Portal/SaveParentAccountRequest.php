<?php

namespace App\Http\Requests\Portal;

use App\Models\ParentAccount;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class SaveParentAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        $parent = $this->route('parent');

        return $parent instanceof ParentAccount
            ? $this->user()->can('update', $parent)
            : $this->user()->can('create', ParentAccount::class);
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        $parent = $this->route('parent');
        $uniqueEmail = Rule::unique('mysql.parent_accounts', 'email')
            ->where('tenant_id', $this->user()->actingTenantId());

        if ($parent instanceof ParentAccount) {
            $uniqueEmail->ignore($parent->id);
        }

        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', $uniqueEmail],
            'password' => [$parent instanceof ParentAccount ? 'nullable' : 'required', 'string', 'max:128', 'confirmed', Password::min(12)],
            'student_ids' => ['present', 'array', 'max:20'],
            'student_ids.*' => [
                'required', 'uuid', 'distinct',
                Rule::exists('tenant.people', 'id')->where(fn (Builder $query) => $query
                    ->where('tenant_id', $this->user()->actingTenantId())
                    ->where('person_type', 'student')
                    ->whereNull('deleted_at')),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'A parent account with this email already exists in your school.',
            'student_ids.*.exists' => 'Only students registered in your school can be linked. Remove any unavailable students before saving.',
            'student_ids.max' => 'You can link up to 20 students to one parent account.',
        ];
    }
}
