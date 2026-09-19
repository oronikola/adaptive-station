<?php

namespace App\Http\Requests\Portal;

use App\Models\TapEvent;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAttendanceExceptionRequest extends FormRequest
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
            'person_id' => ['required', 'uuid', Rule::exists('tenant.people', 'id')],
            'attendance_date' => ['required', 'date'],
            'type' => ['required', Rule::in(['excused_absence', 'manual_present', 'missing_out', 'late_review'])],
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
