<?php

namespace App\Http\Controllers\Platform;

use App\Enums\StationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreStationRequest;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\StationCredential;
use App\Models\StationPairingToken;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class StationController extends Controller
{
    /**
     * Stations live one physical database per tenant now, so there is no
     * single query across all of them — every tenant's own database is
     * queried in turn and the results merged/paginated in PHP. Fine at MVP
     * scale (a handful of tenants, each with a handful of stations); revisit
     * with a denormalized cross-tenant index if this ever needs to scale
     * past that.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Station::class);

        $tenants = Tenant::query()->orderBy('name')->get(['id', 'name', 'code']);

        $selectedTenantId = $request->query('tenant_id') ?: $request->query('school');
        $selectedStatus = $request->query('status') ?: $request->query('view', 'all');

        $thresholdMinutes = (int) config('device.station_offline_threshold_minutes');
        $now = Date::now();

        $queriedTenants = $selectedTenantId
            ? $tenants->where('id', $selectedTenantId)
            : $tenants;

        $allStations = collect();
        $allStationOptions = collect();

        foreach ($queriedTenants as $tenant) {
            TenantDatabase::use($tenant);

            Station::allTenants()
                ->where('tenant_id', $tenant->id)
                ->orderBy('name')
                ->get([
                    'id',
                    'tenant_id',
                    'name',
                    'station_code',
                    'status',
                    'app_version',
                    'last_pending_count',
                    'last_seen_at',
                    'last_scan_at',
                ])
                ->each(function (Station $station) use ($tenant, $now, $thresholdMinutes, $allStationOptions, $allStations) {
                    $station->setRelation('tenant', $tenant);

                    $isOnline = $station->status === StationStatus::Active
                        && $station->last_seen_at !== null
                        && $station->last_seen_at->gt($now->copy()->subMinutes($thresholdMinutes));

                    $stationData = [
                        'id' => $station->id,
                        'tenant_id' => $tenant->id,
                        'name' => $station->name,
                        'station_code' => $station->station_code,
                        'status' => $station->status->value,
                        'app_version' => $station->app_version,
                        'last_pending_count' => $station->last_pending_count,
                        'last_seen_at' => $station->last_seen_at?->toIso8601String(),
                        'last_scan_at' => $station->last_scan_at?->toIso8601String(),
                        'is_online' => $isOnline,
                        'tenant' => [
                            'id' => $tenant->id,
                            'name' => $tenant->name,
                            'code' => $tenant->code,
                        ],
                    ];

                    $allStationOptions->push([
                        'value' => (string) $station->id,
                        'label' => "{$station->name} ({$station->station_code})",
                        'tenant_id' => $tenant->id,
                        'tenant_name' => $tenant->name,
                        'status' => $station->status->value,
                    ]);

                    $allStations->push($stationData);
                });
        }

        if ($selectedStatus && $selectedStatus !== 'all') {
            $allStations = $allStations->filter(function (array $station) use ($selectedStatus) {
                if ($selectedStatus === 'active') {
                    return $station['status'] === 'active';
                }
                if ($selectedStatus === 'pending_activation') {
                    return $station['status'] === 'pending_activation';
                }
                if ($selectedStatus === 'offline') {
                    return ! $station['is_online'] || in_array($station['status'], ['disabled', 'retired'], true);
                }

                return true;
            });
        }

        $sorted = $allStations->sortBy('name')->values();
        $page = (int) $request->integer('page', 1);
        $perPage = 25;

        $stations = new LengthAwarePaginator(
            $sorted->slice(($page - 1) * $perPage, $perPage)->values(),
            $sorted->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return Inertia::render('Platform/stations/stations-list-screen', [
            'stations' => $stations,
            'tenants' => $tenants,
            'allStationOptions' => $allStationOptions->sortBy('label')->values(),
            'filters' => [
                'tenant_id' => $selectedTenantId ?? '',
                'status' => $selectedStatus,
            ],
        ]);
    }

    public function show(Request $request, string $station): Response
    {
        Gate::authorize('viewAny', Station::class);

        [$stationModel, $tenant] = $this->resolveStation($station, $request->query('tenant_id'));

        Gate::authorize('view', $stationModel);

        $thresholdMinutes = (int) config('device.station_offline_threshold_minutes');
        $isOnline = $stationModel->status === StationStatus::Active
            && $stationModel->last_seen_at !== null
            && $stationModel->last_seen_at->gt(Date::now()->subMinutes($thresholdMinutes));

        $credentials = $stationModel->credentials()->orderByDesc('created_at')->get();
        $tenants = Tenant::query()->orderBy('name')->get(['id', 'name', 'code']);

        $schoolStations = collect();
        TenantDatabase::use($tenant);
        Station::allTenants()->where('tenant_id', $tenant->id)->orderBy('name')->get(['id', 'name', 'station_code', 'status', 'tenant_id'])->each(function (Station $stn) use ($tenant, $schoolStations) {
            $schoolStations->push([
                'id' => (string) $stn->id,
                'name' => $stn->name,
                'station_code' => $stn->station_code,
                'status' => $stn->status->value,
                'tenant_id' => $tenant->id,
                'tenant_name' => $tenant->name,
            ]);
        });

        return Inertia::render('Platform/stations/station-detail-screen', [
            'station' => [
                'id' => $stationModel->id,
                'tenant_id' => $tenant->id,
                'name' => $stationModel->name,
                'station_code' => $stationModel->station_code,
                'status' => $stationModel->status->value,
                'app_version' => $stationModel->app_version,
                'configuration' => $stationModel->configuration ?? [],
                'last_pending_count' => $stationModel->last_pending_count,
                'last_seen_at' => $stationModel->last_seen_at?->toIso8601String(),
                'last_scan_at' => $stationModel->last_scan_at?->toIso8601String(),
                'is_online' => $isOnline,
            ],
            'tenant' => $tenant,
            'tenants' => $tenants,
            'schoolStations' => $schoolStations->values(),
            'credentials' => $credentials,
        ]);
    }

    public function updateConfiguration(Request $request, string $station): RedirectResponse
    {
        [$stationModel, $tenant] = $this->resolveStation($station, $request->input('tenant_id'));

        Gate::authorize('update', $stationModel);

        $data = $request->validate([
            'configuration' => ['nullable', 'array'],
        ]);

        Station::updateConfiguration($stationModel, $data['configuration'] ?? [], $request->user());

        return redirect()->route('platform.stations.show', ['station' => $stationModel->id, 'tenant_id' => $tenant->id])
            ->with('success', 'Configuration updated.');
    }

    public function rename(Request $request, string $station): RedirectResponse
    {
        [$stationModel, $tenant] = $this->resolveStation($station, $request->input('tenant_id'));

        Gate::authorize('update', $stationModel);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
        ]);

        Station::rename($stationModel, $data['name'], $request->user());

        return redirect()->route('platform.stations.show', ['station' => $stationModel->id, 'tenant_id' => $tenant->id])
            ->with('success', 'Station renamed.');
    }

    public function issueCredential(Request $request, string $station): RedirectResponse
    {
        Gate::authorize('create', StationCredential::class);

        [$stationModel, $tenant] = $this->resolveStation($station, $request->input('tenant_id'));

        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        ['token' => $token] = StationCredential::issueFor($stationModel, $data['label'] ?? null, $request->user());

        return redirect()->route('platform.stations.show', ['station' => $stationModel->id, 'tenant_id' => $tenant->id])
            ->with('success', 'Credential issued.')
            ->with('deviceToken', $token);
    }

    public function revokeCredential(Request $request, string $station, string $credential): RedirectResponse
    {
        [$stationModel, $tenant] = $this->resolveStation($station, $request->input('tenant_id'));

        $credentialModel = StationCredential::allTenants()->findOrFail($credential);

        Gate::authorize('update', $credentialModel);

        abort_unless($credentialModel->station_id === $stationModel->id, 404);

        StationCredential::revoke($credentialModel, $request->user());

        return redirect()->route('platform.stations.show', ['station' => $stationModel->id, 'tenant_id' => $tenant->id])
            ->with('success', 'Credential revoked.');
    }

    public function store(StoreStationRequest $request): RedirectResponse
    {
        TenantDatabase::use(Tenant::findOrFail($request->validated()['tenant_id']));

        $station = Station::provision($request->validated(), $request->user());
        ['token' => $token] = StationPairingToken::issueFor($station, $request->user());

        return redirect()->route('platform.stations.index', ['tenant_id' => $station->tenant_id])
            ->with('success', "Station \"{$station->name}\" created.")
            ->with('pairingLink', route('kiosk.pair', $token));
    }

    /**
     * $station is deliberately a raw route-parameter string, not a
     * type-hinted Station for implicit binding: Station carries TenantScope,
     * and a platform_super_admin has no tenant_id to satisfy it, so implicit
     * binding would fail-closed to 404 for every station regardless of which
     * tenant it belongs to. Resolve explicitly via allTenants() instead.
     */
    public function issueActivationCode(Request $request, string $station): RedirectResponse
    {
        Gate::authorize('create', StationActivationCode::class);

        $data = $request->validate(['tenant_id' => ['nullable', 'uuid']]);
        [$stationModel, $tenant] = $this->resolveStation($station, $data['tenant_id'] ?? null);

        ['code' => $code] = StationActivationCode::issueFor($stationModel, $request->user());

        if ($request->input('redirect_to') === 'show') {
            return redirect()->route('platform.stations.show', ['station' => $stationModel->id, 'tenant_id' => $tenant->id])
                ->with('success', "Activation code issued for \"{$stationModel->name}\".")
                ->with('activationCode', $code);
        }

        return redirect()->route('platform.stations.index')
            ->with('success', "Activation code issued for \"{$stationModel->name}\".")
            ->with('activationCode', $code);
    }

    public function issuePairingLink(Request $request, string $station): RedirectResponse
    {
        Gate::authorize('create', StationPairingToken::class);

        $data = $request->validate(['tenant_id' => ['required', 'uuid']]);
        TenantDatabase::use(Tenant::findOrFail($data['tenant_id']));

        $station = Station::allTenants()->findOrFail($station);

        ['token' => $token] = StationPairingToken::issueFor($station, $request->user());

        return redirect()->route('platform.stations.index')
            ->with('success', "Pairing link generated for \"{$station->name}\".")
            ->with('pairingLink', route('kiosk.pair', $token));
    }

    public function retire(Request $request, string $station): RedirectResponse
    {
        $data = $request->validate(['tenant_id' => ['required', 'uuid']]);
        [$stationModel] = $this->resolveStation($station, $data['tenant_id']);

        Gate::authorize('update', $stationModel);

        Station::retire($stationModel, $request->user());

        return redirect()->route('platform.stations.index', ['tenant_id' => $data['tenant_id']])
            ->with('success', "Station \"{$stationModel->name}\" retired.");
    }

    public function reactivate(Request $request, string $station): RedirectResponse
    {
        $data = $request->validate(['tenant_id' => ['required', 'uuid']]);
        [$stationModel] = $this->resolveStation($station, $data['tenant_id']);

        Gate::authorize('update', $stationModel);

        Station::reactivate($stationModel, $request->user());

        return redirect()->route('platform.stations.index', ['tenant_id' => $data['tenant_id']])
            ->with('success', "Station \"{$stationModel->name}\" reactivated — issue it a new activation code or pairing link.");
    }

    public function destroy(Request $request, string $station): RedirectResponse
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
            'confirm_code' => ['required', 'string'],
            'purge_attendance' => ['nullable', 'boolean'],
        ]);
        TenantDatabase::use(Tenant::findOrFail($data['tenant_id']));

        $station = Station::allTenants()->findOrFail($station);
        Gate::authorize('delete', $station);

        Validator::make($data, [])->after(function ($validator) use ($data, $station) {
            if ($data['confirm_code'] !== $station->station_code) {
                $validator->errors()->add('confirm_code', 'Type the station code exactly to confirm deletion.');
            }
        })->validate();

        Station::remove($station, $request->user(), (bool) ($data['purge_attendance'] ?? false));

        return redirect()->route('platform.stations.index', ['tenant_id' => $data['tenant_id']])
            ->with('success', "Station \"{$station->name}\" deleted.");
    }

    /**
     * Helper to resolve a station and its corresponding tenant.
     *
     * @return array{0: Station, 1: Tenant}
     */
    protected function resolveStation(string $stationId, ?string $tenantId = null): array
    {
        if ($tenantId) {
            $tenant = Tenant::findOrFail($tenantId);
            TenantDatabase::use($tenant);
            $station = Station::allTenants()->findOrFail($stationId);
            $station->setRelation('tenant', $tenant);

            return [$station, $tenant];
        }

        $tenants = Tenant::all();
        foreach ($tenants as $tenant) {
            TenantDatabase::use($tenant);
            $station = Station::allTenants()->find($stationId);
            if ($station) {
                $station->setRelation('tenant', $tenant);

                return [$station, $tenant];
            }
        }

        abort(404, 'Station not found.');
    }
}
