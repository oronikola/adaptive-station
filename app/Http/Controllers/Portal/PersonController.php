<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StorePersonRequest;
use App\Http\Requests\Portal\UpdatePersonRequest;
use App\Models\Person;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PersonController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Person::class);

        $people = Person::query()
            ->when($request->string('search')->toString(), function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('display_name', 'like', "%{$search}%")
                        ->orWhere('external_id', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where(
                'is_active', $request->string('status')->toString() === 'active',
            ))
            ->orderBy('last_name')->orderBy('first_name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/people/people-list-screen', [
            'people' => $people,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Person::class);

        return Inertia::render('admin/people/people-create-screen');
    }

    public function store(StorePersonRequest $request): RedirectResponse
    {
        $person = Person::registerForTenant(
            $request->user()->tenant_id,
            $request->validated(),
            $request->user(),
        );

        return redirect()->route('portal.people.edit', $person)->with('success', 'Person created.');
    }

    public function edit(Person $person): Response
    {
        Gate::authorize('view', $person);

        $person->load(['rfidCards' => fn ($query) => $query->orderByDesc('assigned_at')]);

        return Inertia::render('admin/people/people-edit-screen', [
            'person' => $person,
        ]);
    }

    public function update(UpdatePersonRequest $request, Person $person): RedirectResponse
    {
        Person::updateDetails($person, $request->validated(), $request->user());

        return redirect()->route('portal.people.edit', $person)->with('success', 'Person updated.');
    }

    public function deactivate(Request $request, Person $person): RedirectResponse
    {
        Gate::authorize('update', $person);

        Person::deactivate($person, $request->user());

        return redirect()->route('portal.people.edit', $person)->with('success', 'Person deactivated.');
    }

    public function reactivate(Request $request, Person $person): RedirectResponse
    {
        Gate::authorize('update', $person);

        Person::reactivate($person, $request->user());

        return redirect()->route('portal.people.edit', $person)->with('success', 'Person reactivated.');
    }
}
