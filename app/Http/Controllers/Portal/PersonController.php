<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StorePersonRequest;
use App\Http\Requests\Portal\UpdatePersonRequest;
use App\Models\ParentAccount;
use App\Models\ParentStudentLink;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\User;
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

        return Inertia::render('Admin/people/people-list-screen', [
            'people' => $people,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Person::class);

        return Inertia::render('Admin/people/people-create-screen');
    }

    public function store(StorePersonRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $tenantId = $request->user()->actingTenantId();
        $actor = $request->user();

        $person = Person::registerForTenant($tenantId, collect($data)->only([
            'person_type', 'first_name', 'middle_name', 'last_name', 'display_name',
            'grade_level', 'section', 'photo_url', 'external_id',
        ])->all(), $actor);

        $this->applyStatus($person, $data['status'] ?? 'active', $actor);

        if (! empty($data['rfid_card_uid'])) {
            RfidCard::assign($tenantId, $person->id, $data['rfid_card_uid'], $actor);
        }

        $temporaryPassword = $this->syncGuardian($person, $tenantId, $data, $actor);

        $redirect = redirect()->route('portal.people.edit', $person)->with('success', 'Person created.');

        return $temporaryPassword !== null ? $redirect->with('temporaryPassword', $temporaryPassword) : $redirect;
    }

    public function edit(Person $person): Response
    {
        Gate::authorize('view', $person);

        $person->load(['rfidCards' => fn ($query) => $query->orderByDesc('assigned_at')]);

        $guardianLink = ParentStudentLink::query()
            ->where('person_id', $person->id)
            ->with('parentAccount')
            ->first();

        return Inertia::render('Admin/people/people-edit-screen', [
            'person' => $person,
            'guardian' => $guardianLink?->parentAccount,
        ]);
    }

    public function update(UpdatePersonRequest $request, Person $person): RedirectResponse
    {
        $data = $request->validated();
        $tenantId = $request->user()->actingTenantId();
        $actor = $request->user();

        Person::updateDetails($person, collect($data)->only([
            'person_type', 'first_name', 'middle_name', 'last_name', 'display_name',
            'grade_level', 'section', 'photo_url', 'external_id',
        ])->all(), $actor);

        $this->applyStatus($person, $data['status'] ?? 'active', $actor);

        $temporaryPassword = $this->syncGuardian($person, $tenantId, $data, $actor);

        $redirect = redirect()->route('portal.people.edit', $person)->with('success', 'Person updated.');

        return $temporaryPassword !== null ? $redirect->with('temporaryPassword', $temporaryPassword) : $redirect;
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

    private function applyStatus(Person $person, string $status, User $actor): void
    {
        if ($status === 'inactive' && $person->is_active) {
            Person::deactivate($person, $actor);
        } elseif ($status === 'active' && ! $person->is_active) {
            Person::reactivate($person, $actor);
        }
    }

    /**
     * Keeps exactly one primary guardian link per person, driven entirely by
     * the Details form's guardian fields: a blank guardian_email removes any
     * existing link, a new email resolves-or-provisions a ParentAccount and
     * (re)links it, and re-submitting the same guardian is a no-op. Returns
     * the new guardian's generated password when one was just provisioned,
     * so the caller can flash it once.
     */
    private function syncGuardian(Person $person, string $tenantId, array $data, User $actor): ?string
    {
        $existingLink = ParentStudentLink::query()->where('person_id', $person->id)->first();
        $email = $data['guardian_email'] ?? null;

        if ($email === null) {
            $existingLink?->delete();

            return null;
        }

        $guardian = ParentAccount::allTenants()
            ->where('tenant_id', $tenantId)
            ->where('email', $email)
            ->first();

        $temporaryPassword = null;
        if ($guardian === null) {
            $phone = $data['guardian_phone'] ?? null;
            ['account' => $guardian, 'temporary_password' => $temporaryPassword] = ParentAccount::provision($tenantId, [
                'name' => $data['guardian_name'] ?? $email,
                'email' => $email,
                'phone_number' => $phone,
                'notification_preferences' => ['notify_in' => true, 'notify_out' => true, 'notify_sms' => $phone !== null],
            ], $actor);
        }

        if ($existingLink !== null && $existingLink->parent_account_id !== $guardian->id) {
            $existingLink->delete();
            $existingLink = null;
        }

        if ($existingLink === null) {
            $guardian->studentLinks()->create(['person_id' => $person->id, 'approved_by' => $actor->id]);
        }

        return $temporaryPassword;
    }
}
