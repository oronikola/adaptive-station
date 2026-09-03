<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreStationRequest;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class StationController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Station::class);

        $stations = Station::allTenants()
            ->with('tenant:id,name')
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('superadmin/stations/stations-list-screen', [
            'stations' => $stations,
            'tenants' => Tenant::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreStationRequest $request): RedirectResponse
    {
        $station = Station::provision($request->validated(), $request->user());

        return redirect()->route('platform.stations.index')->with('success', "Station \"{$station->name}\" created.");
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

        $station = Station::allTenants()->findOrFail($station);

        ['code' => $code] = StationActivationCode::issueFor($station, $request->user());

        return redirect()->route('platform.stations.index')
            ->with('success', "Activation code issued for \"{$station->name}\".")
            ->with('activationCode', $code);
    }
}
