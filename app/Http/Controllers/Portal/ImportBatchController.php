<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Jobs\RunLegacyImportJob;
use App\Models\ImportBatch;
use App\Models\IntegrationProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ImportBatchController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ImportBatch::class);

        $batches = ImportBatch::query()
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Admin/imports/imports-list-screen', [
            'batches' => $batches,
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('create', ImportBatch::class);

        return Inertia::render('Admin/imports/imports-create-screen', [
            'profiles' => IntegrationProfile::query()
                ->orderBy('name')
                ->get(['id', 'name', 'driver']),
        ]);
    }

    /**
     * Runs the job inline (dispatchSync) rather than queued: this MVP has no
     * standing queue worker requirement yet, and an operator triggering an
     * import expects to see the result on the next page load. Preview
     * ($commit=false) and Commit are two separate runs — a preview never
     * mutates data, so there is nothing to "carry forward" into a later
     * commit run; the matching order already makes the commit run safe to
     * re-trigger regardless of how many prior previews happened.
     */
    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', ImportBatch::class);

        $data = $request->validate([
            // Connection-qualified: integration_profiles lives on the
            // 'tenant' connection, not the default one the exists rule
            // checks by default.
            'integration_profile_id' => ['required', 'uuid', 'exists:tenant.integration_profiles,id'],
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
            'commit' => ['required', 'boolean'],
        ]);

        $profile = IntegrationProfile::findOrFail($data['integration_profile_id']);

        $batch = ImportBatch::start(
            $request->user()->tenant_id,
            $profile->id,
            $profile->driver,
            $data['commit'] ? 'Import' : 'Preview',
            $request->user(),
        );

        RunLegacyImportJob::dispatchSync(
            $request->user()->tenant_id,
            $batch->id,
            $data['commit'],
            $data['date_from'],
            $data['date_to'],
            $request->user()->id,
        );

        return redirect()->route('portal.imports.show', $batch)->with('success', $data['commit'] ? 'Import completed.' : 'Preview completed.');
    }

    public function show(ImportBatch $batch): Response
    {
        Gate::authorize('view', $batch);

        return Inertia::render('Admin/imports/imports-show-screen', [
            'batch' => $batch,
            'openExceptionCount' => $batch->exceptions()->where('resolution', 'open')->count(),
        ]);
    }
}
