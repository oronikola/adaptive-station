<?php

namespace App\Http\Controllers\Oversight;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The one screen adaptivestation_admin sees before entering a school's
 * portal — every other role already has exactly one school (its own
 * tenant_id) and never reaches this. Picking a school just stashes its id
 * in the session; SetTenantContext resolves that into the actual tenant
 * connection on every subsequent request, the same way a real tenant_admin's
 * own tenant_id does.
 */
class SchoolSelectionController extends Controller
{
    public function index(Request $request): Response
    {
        $tenants = Tenant::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'status']);

        $statusCounts = $tenants->countBy(fn (Tenant $tenant) => $tenant->status->value);

        return Inertia::render('Oversight/select-school-screen', [
            'tenants' => $tenants,
            'currentTenantId' => $request->session()->get('oversight_tenant_id'),
            'stats' => [
                'total' => $tenants->count(),
                'active' => $statusCounts->get('active', 0),
                'suspended' => $statusCounts->get('suspended', 0),
            ],
        ]);
    }

    public function select(Request $request, Tenant $tenant): RedirectResponse
    {
        $request->session()->put('oversight_tenant_id', $tenant->id);

        return redirect()->route('portal.dashboard');
    }
}
