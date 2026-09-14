<?php

namespace App\Http\Controllers\Api\Device;

use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedStation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Device\ResolveTapRequest;
use App\Models\TapEvent;
use Illuminate\Http\JsonResponse;

/**
 * The kiosk's fallback when a tapped card isn't in its own locally-synced
 * cache (see kiosk-screen.tsx's handleTapSubmit) — unlike events.batch,
 * which uploads fire-and-forget and never waits for a resolution, this
 * endpoint records the tap and waits for essentiel to resolve it (if this
 * tenant is essentiel-configured), returning the result so the kiosk can
 * show who tapped instead of just "unknown." A non-essentiel tenant, or one
 * where essentiel doesn't recognize the card either, gets back
 * {"found": false} — same outcome as the kiosk's local-cache-miss message,
 * just arrived at after checking rather than assumed.
 *
 * One event at a time, not a batch: the whole point is waiting synchronously
 * for a single external HTTP round trip, which doesn't make sense to do for
 * more than one tap in the same request.
 */
class TapEventResolveController extends Controller
{
    use ResolvesAuthenticatedStation;

    public function store(ResolveTapRequest $request): JsonResponse
    {
        $station = $this->station($request);

        $result = TapEvent::acceptBatch($station, [$request->validated()], resolveEssentielSynchronously: true);

        if (! empty($result['rejected'])) {
            return response()->json(['found' => false, 'reason' => 'invalid_request'], 422);
        }

        $resolution = $result['resolutions'][$request->validated('id')] ?? ['found' => false, 'reason' => null];

        return response()->json($resolution);
    }
}
