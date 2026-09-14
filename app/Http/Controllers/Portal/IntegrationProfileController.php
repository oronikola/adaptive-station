<?php

namespace App\Http\Controllers\Portal;

use App\Enums\IntegrationRunDirection;
use App\Http\Controllers\Controller;
use App\Jobs\RunLegacyExportJob;
use App\Models\IntegrationProfile;
use App\Models\IntegrationRun;
use App\Models\TapEvent;
use App\Services\Integrations\LegacyMysqlConnector;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IntegrationProfileController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', IntegrationProfile::class);

        $profiles = IntegrationProfile::query()
            ->orderBy('name')
            ->get(['id', 'name', 'driver', 'direction', 'status', 'last_successful_run_at']);

        return Inertia::render('Admin/integrations/integrations-list-screen', [
            'profiles' => $profiles,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', IntegrationProfile::class);

        return Inertia::render('Admin/integrations/integrations-create-screen');
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', IntegrationProfile::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'driver' => ['required', 'string', 'in:legacy_mysql,essentiel_api'],
            'direction' => ['required', 'string', 'in:import_only,export_only,bidirectional'],
            'config' => ['required', 'string'],
        ]);

        $config = json_decode($data['config'], true);
        if (! is_array($config)) {
            return back()->withErrors(['config' => 'Must be valid JSON.'])->withInput();
        }

        IntegrationProfile::createForTenant($request->user()->actingTenantId(), [
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

        return Inertia::render('Admin/integrations/integrations-edit-screen', [
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

    /**
     * A handoff file, not a live sync: writes essentiel's own taphistory
     * column shape (not the human-readable attendance report at
     * portal.attendance.export) to a CSV someone downloads and gives to
     * essentiel directly, for their own team to import on their side — the
     * fallback for when there's no live database connection or write API to
     * push into (see the export() action above for when there is one).
     * Reuses LegacyMysqlConnector::mapTapEventRow() so this can never drift
     * from what the live export path would have written for the same tap.
     */
    public function exportCsv(Request $request, IntegrationProfile $profile): StreamedResponse
    {
        Gate::authorize('update', $profile);

        $data = $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        $columns = ['tdate', 'ttime', 'tapstate', 'studid', 'utype', 'mode', 'tapstatus', 'station_id', 'createddatetime'];

        return response()->streamDownload(function () use ($data, $columns) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);

            TapEvent::search(['date_from' => $data['date_from'], 'date_to' => $data['date_to']])
                ->with(['station', 'person'])
                ->cursor()
                ->each(function (TapEvent $event) use ($handle) {
                    $row = LegacyMysqlConnector::mapTapEventRow($event);
                    fputcsv($handle, [
                        $row['tdate'], $row['ttime'], $row['tapstate'], $row['studid'], $row['utype'],
                        $row['mode'], $row['tapstatus'], $row['legacy_station_id'], $row['createddatetime'],
                    ]);
                });

            fclose($handle);
        }, "legacy-taphistory-{$profile->id}-{$data['date_from']}-to-{$data['date_to']}.csv", ['Content-Type' => 'text/csv']);
    }
}
