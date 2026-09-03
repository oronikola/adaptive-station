<?php

namespace App\Http\Controllers\Portal;

use App\Enums\IntegrationRunDirection;
use App\Http\Controllers\Controller;
use App\Jobs\RunLegacyExportJob;
use App\Models\IntegrationProfile;
use App\Models\IntegrationRun;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationProfileController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', IntegrationProfile::class);

        $profiles = IntegrationProfile::query()
            ->orderBy('name')
            ->get(['id', 'name', 'driver', 'direction', 'status', 'last_successful_run_at']);

        return Inertia::render('admin/integrations/integrations-list-screen', [
            'profiles' => $profiles,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', IntegrationProfile::class);

        return Inertia::render('admin/integrations/integrations-create-screen');
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', IntegrationProfile::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'driver' => ['required', 'string', 'in:legacy_mysql'],
            'direction' => ['required', 'string', 'in:import_only,export_only,bidirectional'],
            'config' => ['required', 'string'],
        ]);

        $config = json_decode($data['config'], true);
        if (! is_array($config)) {
            return back()->withErrors(['config' => 'Must be valid JSON.'])->withInput();
        }

        IntegrationProfile::createForTenant($request->user()->tenant_id, [
            'name' => $data['name'],
            'driver' => $data['driver'],
            'direction' => $data['direction'],
            'config_encrypted' => $config,
        ], $request->user());

        return redirect()->route('portal.integrations.index')->with('success', 'Integration profile created.');
    }

    public function edit(IntegrationProfile $profile): Response
    {
        Gate::authorize('update', $profile);

        return Inertia::render('admin/integrations/integrations-edit-screen', [
            'profile' => $profile->only(['id', 'name', 'driver', 'direction', 'status', 'last_successful_run_at']),
            'runs' => IntegrationRun::where('integration_profile_id', $profile->id)
                ->orderByDesc('created_at')
                ->limit(10)
                ->get(['id', 'direction', 'status', 'started_at', 'finished_at', 'summary']),
        ]);
    }

    /**
     * Config is write-only: the edit form never repopulates prior values
     * (blank inputs), matching the shown-once-secret convention used
     * elsewhere (device tokens, activation codes, temp passwords).
     */
    public function update(Request $request, IntegrationProfile $profile): RedirectResponse
    {
        Gate::authorize('update', $profile);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'direction' => ['required', 'string', 'in:import_only,export_only,bidirectional'],
            'config' => ['nullable', 'string'],
        ]);

        $profile->forceFill([
            'name' => $data['name'],
            'direction' => $data['direction'],
        ])->save();

        if (! empty($data['config'])) {
            $config = json_decode($data['config'], true);
            if (! is_array($config)) {
                return back()->withErrors(['config' => 'Must be valid JSON.'])->withInput();
            }

            IntegrationProfile::updateConfig($profile, $config, $request->user());
        }

        return redirect()->route('portal.integrations.edit', $profile)->with('success', 'Integration profile saved.');
    }

    public function export(Request $request, IntegrationProfile $profile): RedirectResponse
    {
        Gate::authorize('update', $profile);

        $data = $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        $run = IntegrationRun::start($profile, IntegrationRunDirection::Export);

        RunLegacyExportJob::dispatchSync($run->id, $profile->tenant_id, $data['date_from'], $data['date_to']);

        return redirect()->route('portal.integrations.edit', $profile)->with('success', 'Export run completed.');
    }
}
