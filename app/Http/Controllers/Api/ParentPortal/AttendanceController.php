<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\TapEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    /**
     * $person is intentionally a raw route parameter, not an implicit Person
     * binding — Person lives on the per-tenant connection, and validating it
     * against the calling parent's own authorizedStudents() (rather than a
     * generic "does this student exist" check) is what actually prevents one
     * parent from reading another family's attendance by guessing IDs.
     */
    public function index(Request $request, string $person): JsonResponse
    {
        $parent = $request->attributes->get('parent_account');
        abort_unless($parent->authorizedStudents()->whereKey($person)->exists(), 403, 'This student is not linked to your account.');

        $filters = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);
        $filters['person_id'] = $person;

        $events = TapEvent::search($filters)->with('station')->paginate(30)->withQueryString();

        $events->getCollection()->transform(fn (TapEvent $event) => [
            'id' => $event->id,
            'event_type' => $event->event_type->value,
            'occurred_at' => $event->occurred_at->toIso8601String(),
            'attendance_date_local' => $event->attendance_date_local->toDateString(),
            'station' => $event->station?->name,
        ]);

        return response()->json($events);
    }
}
