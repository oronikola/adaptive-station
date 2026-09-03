<?php

namespace App\Http\Requests\Portal;

use App\Models\RfidCard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRfidCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', RfidCard::class);
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
            'person_id' => [
                'required', 'uuid',
                Rule::exists('people', 'id')->where(fn ($query) => $query->where('tenant_id', $tenantId)),
            ],
            // No is_active filter here — uq_rfid_cards_tenant_uid covers every
            // row for the tenant regardless of status, so a deactivated card's
            // UID is unavailable for reuse too. Checking active-only would
            // pass validation then fail on the DB constraint.
            'card_uid' => [
                'required', 'string', 'max:100',
                Rule::unique('rfid_cards')->where(fn ($query) => $query->where('tenant_id', $tenantId)),
            ],
        ];
    }
}
