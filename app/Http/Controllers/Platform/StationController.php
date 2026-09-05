<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreStationRequest;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
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

        $allStations = collect();
        foreach ($tenants as $tenant) {
            TenantDatabase::use($tenant);

            Station::allTenants()->get()->each(function (Station $station) use ($tenant, $allStations) {
                $station->setRelation('tenant', $tenant);
                $allStations->push($station);
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
        ]);
    }

    public function store(StoreStationRequest $request): RedirectResponse
    {
        TenantDatabase::use(Tenant::findOrFail($request->validated()['tenant_id']));

        $station = Station::provision($request->validated(), $request->user());

        return redirect()->route('platform.stations.index')->with('success', "Station \"{$station->name}\" created.");
    }

    /**
     * $station is deliberately a raw route-parameter string, not a
     * type-hinted Station for implicit binding: Station carries TenantScope,
     * and a platform_super_admin has no tenant_id to satisfy it, so implicit
     * binding would fail-closed to 404 for every station regardless of which
     * tenant it belongs to. Resolve explicitly via allTenants() instead.
     *
     * tenant_id must be submitted alongside the station id — a station's
     * physical database can't be discovered from its id alone anymore,
     * unlike when everything shared one database.
     */
    public function issueActivationCode(Request $request, string $station): RedirectResponse
    {
        Gate::authorize('create', StationActivationCode::class);

        $data = $request->validate(['tenant_id' => ['required', 'uuid']]);
        TenantDatabase::use(Tenant::findOrFail($data['tenant_id']));

        $station = Station::allTenants()->findOrFail($station);

        ['code' => $code] = StationActivationCode::issueFor($station, $request->user());

        return redirect()->route('platform.stations.index')
            ->with('success', "Activation code issued for \"{$station->name}\".")
            ->with('activationCode', $code);
    }
}
