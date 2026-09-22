<?php

namespace App\Http\Controllers\Api\Device;

use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedStation;
use App\Http\Controllers\Controller;
use App\Models\KioskMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The kiosk's idle-screen slideshow, for the one station this credential
 * authenticates as — never any other station's, even within the same
 * tenant, since a superadmin can (and is expected to) give different
 * physical kiosks different media. Polled on a plain interval rather than
 * folded into the master-data change feed (see MasterDataFeedController):
 * media changes rarely and this is a handful of rows at most, so a cursor/
 * delta feed would be pure overhead for no benefit.
 */
class KioskMediaController extends Controller
{
    use ResolvesAuthenticatedStation;

    public function index(Request $request): JsonResponse
    {
        $station = $this->station($request);

        $media = KioskMedia::query()
            ->activeForStation($station->id)
            ->get()
            ->map(fn (KioskMedia $item) => [
                'id' => $item->id,
                'type' => $item->type->value,
                'url' => $item->url,
                'duration_seconds' => $item->duration_seconds,
                // The kiosk caches this in IndexedDB, whose getAll() returns
                // rows by primary key (the id, a UUID) rather than
                // insertion order — this is what lets it re-sort into the
                // display order activeForStation() computed, once read back
                // out of that cache.
                'position' => $item->position,
            ]);

        return response()->json(['media' => $media]);
    }
}
