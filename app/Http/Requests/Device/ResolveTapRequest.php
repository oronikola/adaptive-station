<?php

namespace App\Http\Requests\Device;

use App\Enums\TapEventType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates the single event this endpoint accepts — same shape as one item
 * inside SubmitTapEventBatchRequest's events array, just not nested, since
 * this endpoint only ever handles one tap at a time (see
 * TapEventResolveController's docblock for why it's a separate endpoint
 * from events.batch rather than a batch of one).
 */
class ResolveTapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'id' => ['required', 'uuid'],
            'card_uid' => ['required', 'string', 'max:100'],
            'event_type' => ['required', Rule::enum(TapEventType::class)],
            'occurred_at' => ['required', 'date'],
            'occurred_offset_minutes' => ['required', 'integer', 'between:-720,840'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
