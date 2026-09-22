<?php

namespace App\Http\Controllers\Portal;

use App\Enums\StationStatus;
use App\Http\Controllers\Controller;
use App\Models\KioskMedia;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\StationCredential;
use App\Models\StationPairingToken;
use Illuminate\Http\JsonResponse;
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

    public function show(Request $request, Station $station): Response|JsonResponse
    {
        Gate::authorize('view', $station);

        if ($request->expectsJson()) {
            $thresholdMinutes = (int) config('device.station_offline_threshold_minutes');

            return response()->json([
                'station' => [
                    'id' => $station->id,
                    'name' => $station->name,
                    'station_code' => $station->station_code,
                    'status' => $station->status->value,
                    'app_version' => $station->app_version,
                    'configuration' => $station->configuration,
                    'last_pending_count' => $station->last_pending_count,
                    'last_seen_at' => $station->last_seen_at?->toIso8601String(),
                    'is_online' => $station->status === StationStatus::Active
                        && $station->last_seen_at !== null
                        && $station->last_seen_at->gt(Date::now()->subMinutes($thresholdMinutes)),
                ],
                'credentials' => $station->credentials()->orderByDesc('created_at')->get(),
            ]);
        }

        return Inertia::render('Admin/stations/station-detail-screen', [
            'station' => $station,
            'credentials' => $station->credentials()->orderByDesc('created_at')->get(),
            'hasPairingLink' => $station->pairingTokens()->whereNull('revoked_at')->exists(),
            'media' => $this->serializeMedia($station),
        ]);
    }

    public function updateConfiguration(Request $request, Station $station): RedirectResponse|JsonResponse
    {
        Gate::authorize('update', $station);

        $data = $request->validate([
            'configuration' => ['nullable', 'array'],
        ]);

        Station::updateConfiguration($station, $data['configuration'] ?? [], $request->user());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Configuration updated.',
                'station' => $station->fresh(),
            ]);
        }

        return redirect()->route('portal.stations.show', $station)->with('success', 'Configuration updated.');
    }

    public function resetActivation(Request $request, Station $station): RedirectResponse
    {
        Gate::authorize('update', $station);

        Station::resetToPendingActivation($station, $request->user());

        return redirect()->route('portal.stations.show', $station)
            ->with('success', 'Station reset to pending activation. Existing credentials were revoked — issue a new activation code to re-provision it.');
    }

    public function issueCredential(Request $request, Station $station): RedirectResponse|JsonResponse
    {
        Gate::authorize('create', StationCredential::class);

        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        ['token' => $token] = StationCredential::issueFor($station, $data['label'] ?? null, $request->user());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Credential issued.',
                'deviceToken' => $token,
                'credentials' => $station->credentials()->orderByDesc('created_at')->get(),
            ]);
        }

        return redirect()->route('portal.stations.show', $station)
            ->with('success', 'Credential issued.')
            ->with('deviceToken', $token);
    }

    public function revokeCredential(Request $request, Station $station, StationCredential $credential): RedirectResponse|JsonResponse
    {
        Gate::authorize('update', $credential);

        abort_unless($credential->station_id === $station->id, 404);

        StationCredential::revoke($credential, $request->user());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Credential revoked.',
                'credentials' => $station->credentials()->orderByDesc('created_at')->get(),
            ]);
        }

        return redirect()->route('portal.stations.show', $station)->with('success', 'Credential revoked.');
    }

    public function issueActivationCode(Request $request, Station $station): RedirectResponse|JsonResponse
    {
        Gate::authorize('create', StationActivationCode::class);

        ['code' => $code] = StationActivationCode::issueFor($station, $request->user());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Activation code issued.',
                'activationCode' => $code,
            ]);
        }

        return redirect()->route('portal.stations.show', $station)
            ->with('success', 'Activation code issued.')
            ->with('activationCode', $code);
    }

    public function issuePairingLink(Request $request, Station $station): RedirectResponse
    {
        Gate::authorize('create', StationPairingToken::class);

        ['token' => $token] = StationPairingToken::issueFor($station, $request->user());

        return redirect()->route('portal.stations.show', $station)
            ->with('success', 'Station link reset. Any previous link stopped working.')
            ->with('pairingLink', route('kiosk.pair', $token));
    }

    public function storeMedia(Request $request, Station $station): RedirectResponse
    {
        Gate::authorize('manageForStation', [KioskMedia::class, $station]);

        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,mp4,webm', 'max:102400'],
            'duration_seconds' => ['nullable', 'integer', 'min:1', 'max:120'],
        ]);

        KioskMedia::uploadFor($station, $data['file'], $data['duration_seconds'] ?? null, $request->user()->id);

        return redirect()->route('portal.stations.show', $station)->with('success', 'Media uploaded.');
    }

    public function updateMedia(Request $request, Station $station, KioskMedia $media): RedirectResponse
    {
        Gate::authorize('update', $media);
        abort_unless($media->station_id === $station->id, 404);

        $data = $request->validate([
            'position' => ['sometimes', 'integer', 'min:0'],
            'duration_seconds' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        KioskMedia::updateForStation($media, $data);

        return redirect()->route('portal.stations.show', $station)->with('success', 'Media updated.');
    }

    public function destroyMedia(Request $request, Station $station, KioskMedia $media): RedirectResponse
    {
        Gate::authorize('delete', $media);
        abort_unless($media->station_id === $station->id, 404);

        $media->purge();

        return redirect()->route('portal.stations.show', $station)->with('success', 'Media removed.');
    }

    /** @return array<int, array<string, mixed>> */
    private function serializeMedia(Station $station): array
    {
        return $station->media()->orderBy('position')->orderBy('created_at')->get()
            ->map(fn (KioskMedia $media) => [
                'id' => $media->id,
                'type' => $media->type->value,
                'url' => $media->url,
                'position' => $media->position,
                'duration_seconds' => $media->duration_seconds,
                'is_active' => $media->is_active,
                'created_at' => $media->created_at->toIso8601String(),
            ])
            ->all();
    }
}
