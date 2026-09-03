<?php

namespace App\Http\Requests\Device;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates only the batch envelope. Each individual event is validated
 * independently inside App\Models\TapEvent::acceptBatch() so one malformed
 * item does not sink its valid siblings — a single FormRequest with nested
 * array rules would 422 the entire request on one bad item.
 */
class SubmitTapEventBatchRequest extends FormRequest
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
            'events' => ['required', 'array', 'max:'.config('device.max_batch_size')],
        ];
    }
}
