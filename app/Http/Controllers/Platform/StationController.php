<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreStationRequest;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\StationPairingToken;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
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

    /**
     * A station's link is minted the moment it's created — there is no
     * separate "now generate a link" step for the superadmin to remember.
     * The school admin's whole job is: open this one link on the kiosk.
     */
    public function store(StoreStationRequest $request): RedirectResponse
    {
        TenantDatabase::use(Tenant::findOrFail($request->validated()['tenant_id']));

        $station = Station::provision($request->validated(), $request->user());
        ['token' => $token] = StationPairingToken::issueFor($station, $request->user());

        return redirect()->route('platform.stations.index')
            ->with('success', "Station \"{$station->name}\" created.")
            ->with('pairingLink', route('kiosk.pair', $token));
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

    /**
     * Same tenant-resolution caveat as issueActivationCode() above — $station
     * is a raw id, resolved explicitly via allTenants() after switching to
     * the submitted tenant_id's database.
     */
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

    /**
     * Same tenant-resolution caveat as issueActivationCode()/issuePairingLink()
     * above. Type-to-confirm (confirm_code must match station_code) is
     * validated here rather than via a dedicated FormRequest (see
     * DestroyTenantRequest for that pattern), since this controller's
     * $station is a raw id — there is no bound model yet for a FormRequest's
     * authorize()/rules() to inspect before the tenant database connection is
     * even selected.
     */
    public function destroy(Request $request, string $station): RedirectResponse
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
            'confirm_code' => ['required', 'string'],
        ]);
        TenantDatabase::use(Tenant::findOrFail($data['tenant_id']));

        $station = Station::allTenants()->findOrFail($station);
        Gate::authorize('delete', $station);

        Validator::make($data, [])->after(function ($validator) use ($data, $station) {
            if ($data['confirm_code'] !== $station->station_code) {
                $validator->errors()->add('confirm_code', 'Type the station code exactly to confirm deletion.');
            }
        })->validate();

        Station::remove($station, $request->user());

        return redirect()->route('platform.stations.index')->with('success', "Station \"{$station->name}\" deleted.");
    }
}
