<?php

namespace App\Http\Controllers\Api\Device;

use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedStation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Device\SubmitTapEventBatchRequest;
use App\Models\TapEvent;
use Illuminate\Http\JsonResponse;

class TapEventBatchController extends Controller
{
    use ResolvesAuthenticatedStation;

    public function store(SubmitTapEventBatchRequest $request): JsonResponse
    {
        $station = $this->station($request);

        $result = TapEvent::acceptBatch($station, $request->validated('events'));

        return response()->json([
            'accepted_event_ids' => $result['accepted'],
            // Repeat taps are intentionally ignored, rather than rejected:
            // the kiosk removes them from its offline queue and restores the
            // last event type the server kept.
            'ignored_event_ids' => $result['ignored'],
            'rejected_events' => $result['rejected'],
            // What the server actually resolved and stored per event id —
            // may differ from the event_type the kiosk submitted (its own
            // local guess). See TapEvent::acceptBatch()'s docblock on
            // $eventTypes.
            'resolved_event_types' => $result['eventTypes'],
        ]);
    }
}
