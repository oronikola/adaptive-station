<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\SaveParentAccountRequest;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Services\ParentAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ParentAccountController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', ParentAccount::class);
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:100']]);
        $search = $filters['search'] ?? '';
        $parents = ParentAccount::query()
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', '%'.$search.'%')
                ->orWhere('email', 'like', '%'.$search.'%')
                ->orWhere('login_id', 'like', '%'.$search.'%')))
            ->withCount('studentLinks')->orderBy('name')->orderBy('id')->paginate(25)->withQueryString();

        return Inertia::render('Admin/parents/parents-list-screen', ['parents' => $parents, 'filters' => ['search' => $search]]);
    }

    public function create(): Response
    {
        Gate::authorize('create', ParentAccount::class);

        return Inertia::render('Admin/parents/parent-form-screen', ['parent' => null, 'linkedStudents' => []]);
    }

    public function store(SaveParentAccountRequest $request, ParentAccountService $service): RedirectResponse
    {
        $parent = $service->save($request->user(), $request->validated());

        return redirect()->route('portal.parents.edit', $parent)->with('success', 'Parent account created and student links approved.');
    }

    public function edit(ParentAccount $parent): Response
    {
        Gate::authorize('update', $parent);
        $ids = $parent->studentLinks()->pluck('person_id');
        $students = Person::withTrashed()->whereIn('id', $ids)->get()->keyBy('id');
        $linkedStudents = $ids->map(function ($id) use ($students) {
            $student = $students->get($id);

            return [
                'id' => $id,
                'display_name' => $student?->display_name ?? 'Unavailable student',
                'grade_level' => $student?->grade_level,
                'section' => $student?->section,
                'is_active' => $student?->is_active ?? false,
                'unavailable' => $student === null || $student->trashed(),
            ];
        });

        return Inertia::render('Admin/parents/parent-form-screen', ['parent' => $parent, 'linkedStudents' => $linkedStudents]);
    }

    public function update(SaveParentAccountRequest $request, ParentAccount $parent, ParentAccountService $service): RedirectResponse
    {
        $service->save($request->user(), $request->validated(), $parent);

        return redirect()->route('portal.parents.edit', $parent)->with('success', 'Parent details and approved student links updated.');
    }

    public function status(Request $request, ParentAccount $parent, ParentAccountService $service): RedirectResponse
    {
        Gate::authorize('update', $parent);
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $service->setActive($request->user(), $parent, (bool) $data['is_active']);

        return back()->with('success', $data['is_active'] ? 'Parent account reactivated.' : 'Parent access deactivated.');
    }

    public function students(Request $request): JsonResponse
    {
        Gate::authorize('create', ParentAccount::class);
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100']]);
        $search = $data['search'] ?? '';
        $students = Person::query()->where('person_type', 'student')
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('display_name', 'like', '%'.$search.'%')->orWhere('external_id', 'like', '%'.$search.'%')))
            ->orderBy('display_name')->orderBy('id')->limit(30)
            ->get(['id', 'display_name', 'grade_level', 'section', 'is_active']);

        return response()->json(['students' => $students]);
    }
}
