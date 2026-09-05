<?php

namespace App\Http\Controllers\Portal;

use App\Enums\StationStatus;
use App\Http\Controllers\Controller;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\StationCredential;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class StationController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Station::class);

        $thresholdMinutes = (int) config('device.station_offline_threshold_minutes');

        $stations = Station::query()
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Station $station) => [
                'id' => $station->id,
                'name' => $station->name,
                'station_code' => $station->station_code,
                'status' => $station->status->value,
                'app_version' => $station->app_version,
                'last_pending_count' => $station->last_pending_count,
                'last_seen_at' => $station->last_seen_at?->toIso8601String(),
                'is_online' => $station->status === StationStatus::Active
                    && $station->last_seen_at !== null
                    && $station->last_seen_at->gt(Date::now()->subMinutes($thresholdMinutes)),
            ]);

        return Inertia::render('Admin/stations/stations-list-screen', [
            'stations' => $stations,
        ]);
    }

    public function show(Station $station): Response
    {
        Gate::authorize('view', $station);

        return Inertia::render('Admin/stations/station-detail-screen', [
            'station' => $station,
            'credentials' => $station->credentials()->orderByDesc('created_at')->get(),
        ]);
    }

    public function updateConfiguration(Request $request, Station $station): RedirectResponse
    {
        Gate::authorize('update', $station);

        $data = $request->validate([
            'configuration' => ['nullable', 'array'],
        ]);

        Station::updateConfiguration($station, $data['configuration'] ?? [], $request->user());

        return redirect()->route('portal.stations.show', $station)->with('success', 'Configuration updated.');
    }

    public function issueCredential(Request $request, Station $station): RedirectResponse
    {
        Gate::authorize('create', StationCredential::class);

        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        ['token' => $token] = StationCredential::issueFor($station, $data['label'] ?? null, $request->user());

        return redirect()->route('portal.stations.show', $station)
            ->with('success', 'Credential issued.')
            ->with('deviceToken', $token);
    }

    public function revokeCredential(Request $request, Station $station, StationCredential $credential): RedirectResponse
    {
        Gate::authorize('update', $credential);

        abort_unless($credential->station_id === $station->id, 404);

        StationCredential::revoke($credential, $request->user());

        return redirect()->route('portal.stations.show', $station)->with('success', 'Credential revoked.');
    }

    public function issueActivationCode(Request $request, Station $station): RedirectResponse
    {
        Gate::authorize('create', StationActivationCode::class);

        ['code' => $code] = StationActivationCode::issueFor($station, $request->user());

        return redirect()->route('portal.stations.show', $station)
            ->with('success', 'Activation code issued.')
            ->with('activationCode', $code);
    }
}
