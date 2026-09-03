<?php

namespace App\Http\Controllers\Portal;

use App\Enums\ImportExceptionResolution;
use App\Http\Controllers\Controller;
use App\Models\ImportBatch;
use App\Models\ImportException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ImportExceptionController extends Controller
{
    public function index(Request $request, ImportBatch $batch): Response
    {
        Gate::authorize('view', $batch);

        $resolution = $request->string('resolution')->toString();

        $exceptions = $batch->exceptions()
            ->when($resolution !== '', fn ($q) => $q->where('resolution', $resolution))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/imports/imports-exceptions-list-screen', [
            'batch' => $batch->only(['id', 'source_system', 'source_description', 'status']),
            'exceptions' => $exceptions,
            'filters' => ['resolution' => $resolution],
        ]);
    }

    public function resolve(Request $request, ImportBatch $batch, ImportException $exception): RedirectResponse
    {
        Gate::authorize('resolveException', $batch);
        abort_unless($exception->import_batch_id === $batch->id, 404);

        $data = $request->validate([
            'resolution' => ['required', 'string', 'in:ignored,resolved'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $exception->resolve($request->user(), ImportExceptionResolution::from($data['resolution']), $data['note'] ?? null);

        return redirect()->route('portal.imports.exceptions.index', $batch)->with('success', 'Exception resolved.');
    }
}
