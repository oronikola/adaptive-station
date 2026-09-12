<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Jobs\RunCsvRosterImportJob;
use App\Jobs\RunLegacyImportJob;
use App\Models\ImportBatch;
use App\Models\IntegrationProfile;
use App\Models\ParentAccount;
use App\Services\Integrations\RosterCsvImporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
        $tenantId = $request->user()->actingTenantId();

        $batch = ImportBatch::start(
            $tenantId,
            $profile->id,
            $profile->driver,
            $data['commit'] ? 'Import' : 'Preview',
            $request->user(),
        );

        RunLegacyImportJob::dispatchSync(
            $tenantId,
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

    public function createCsv(): Response
    {
        Gate::authorize('create', ImportBatch::class);

        return Inertia::render('Admin/imports/imports-csv-create-screen');
    }

    /**
     * Same dispatchSync/preview-vs-commit shape as store() above. The file is
     * stored to disk first (a job's constructor args must be serializable,
     * so an UploadedFile instance can't be passed through) and always
     * deleted by the job once it finishes, success or failure.
     */
    public function storeCsv(Request $request): RedirectResponse
    {
        Gate::authorize('create', ImportBatch::class);

        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'commit' => ['required', 'boolean'],
        ]);

        $tenantId = $request->user()->actingTenantId();
        $storedPath = $data['file']->store('imports/'.$tenantId, 'local');

        $batch = ImportBatch::start(
            $tenantId,
            null,
            RosterCsvImporter::SOURCE_SYSTEM,
            $data['commit'] ? 'CSV upload' : 'CSV upload (preview)',
            $request->user(),
        );

        RunCsvRosterImportJob::dispatchSync(
            $tenantId,
            $batch->id,
            $storedPath,
            $data['commit'],
            $request->user()->id,
        );

        return redirect()->route('portal.imports.show', $batch)
            ->with('success', $data['commit'] ? 'Import completed.' : 'Preview completed.');
    }

    /**
     * Streams a CSV of email + temporary password for every guardian account
     * this batch newly created — the one-time-per-batch view into passwords
     * that would otherwise never reach anyone, since a CSV row can't type
     * one in. Passwords stay recoverable afterward too (same as
     * User/SmsGatewayDevice), so re-downloading later still works.
     */
    public function downloadCredentials(ImportBatch $batch): StreamedResponse
    {
        Gate::authorize('view', $batch);

        $ids = $batch->summary['new_parent_account_ids'] ?? [];
        abort_if($ids === [], 404);

        $accounts = ParentAccount::allTenants()->whereIn('id', $ids)->get(['login_id', 'email', 'password_plaintext']);

        return response()->streamDownload(function () use ($accounts) {
            $out = fopen('php://output', 'wb');
            fputcsv($out, ['login_id', 'email', 'temporary_password']);
            foreach ($accounts as $account) {
                fputcsv($out, [$account->login_id, $account->email, $account->password_plaintext]);
            }
            fclose($out);
        }, 'import-'.$batch->id.'-guardian-credentials.csv', ['Content-Type' => 'text/csv']);
    }
}
