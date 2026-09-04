<?php

namespace App\Http\Requests\Portal;

use App\Models\RfidCard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReplaceRfidCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('rfidCard'));
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('card_uid')) {
            $this->merge(['card_uid' => RfidCard::normalizeCardUid((string) $this->input('card_uid'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'card_uid' => [
                'required', 'string', 'max:100',
                Rule::unique('tenant.rfid_cards')->where(fn ($query) => $query->where('tenant_id', $tenantId)),
            ],
        ];
    }
}
