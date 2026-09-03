<?php

namespace App\Http\Controllers\Api\Device;

use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedStation;
use App\Http\Controllers\Controller;
use App\Models\DeviceSyncCursor;
use App\Models\MasterDataChange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;

class MasterDataFeedController extends Controller
{
    use ResolvesAuthenticatedStation;

    /**
     * Per ADR-004, the server never unilaterally advances a kiosk's applied
     * cursor — but the `cursor` value the kiosk sends on every pull request
     * IS its own claim of "last-applied version," so it is persisted here
     * (guarded with max() against the stored value, defensive against a
     * stale/out-of-order request) purely for station-health visibility.
     */
    public function index(Request $request): JsonResponse
    {
        $station = $this->station($request);
        $cursor = max(0, $request->integer('cursor'));
        $batchSize = (int) config('device.master_data_batch_size');

        $changes = MasterDataChange::where('version', '>', $cursor)
            ->orderBy('version')
            ->limit($batchSize)
            ->get();

        $nextCursor = $changes->isEmpty() ? $cursor : (int) $changes->last()->version;

        // Explicitly default master_data_version on create — otherwise a
        // freshly-created row's in-memory attribute is PHP null (Eloquent
        // has no knowledge of the column's DB-level default after insert),
        // and max(null, 0) resolves to null (PHP's tie-break for "equal"
        // values returns the first argument), which then fails the NOT NULL
        // constraint on the very next save().
        $cursorRow = DeviceSyncCursor::firstOrCreate(
            ['station_id' => $station->id],
            ['master_data_version' => 0],
        );
        $cursorRow->forceFill([
            'master_data_version' => max((int) $cursorRow->master_data_version, $cursor),
            'last_pull_at' => Date::now(),
        ])->save();

        return response()->json([
            'changes' => $changes->map(fn (MasterDataChange $change) => [
                'version' => $change->version,
                'entity_type' => $change->entity_type->value,
                'entity_id' => $change->entity_id,
                'operation' => $change->operation->value,
                'payload' => $change->payload,
                'changed_at' => $change->changed_at->toIso8601String(),
            ]),
            'next_cursor' => $nextCursor,
            'has_more' => $changes->count() === $batchSize,
        ]);
    }
}
