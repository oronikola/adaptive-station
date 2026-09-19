<?php

namespace App\Http\Requests\Portal;

use App\Models\TapEvent;
use Illuminate\Foundation\Http\FormRequest;

class StoreAttendanceCalendarDayRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', TapEvent::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'is_school_day' => ['required', 'boolean'],
            'label' => ['nullable', 'string', 'max:150'],
        ];
    }
}
