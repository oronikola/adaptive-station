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
            'rejected_events' => $result['rejected'],
        ]);
    }
}
