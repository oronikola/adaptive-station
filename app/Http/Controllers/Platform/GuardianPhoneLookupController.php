<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\Tenant;
use App\Support\TenantDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class GuardianPhoneLookupController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Tenant::class);

        $phoneNumber = $request->string('phone_number')->trim()->toString();

        $guardianAccounts = ParentAccount::allTenants()
            ->with([
                'tenant:id,name,code',
                'studentLinks:parent_account_id,person_id',
            ])
            ->whereNotNull('phone_number')
            ->when($phoneNumber !== '', fn ($query) => $query->where('phone_number', 'like', "%{$phoneNumber}%"))
            ->orderBy('phone_number')
            ->paginate(50)
            ->withQueryString();

        $studentsByTenant = $this->studentsByTenant($guardianAccounts->getCollection());

        $guardianAccounts->through(function (ParentAccount $guardian) use ($studentsByTenant): array {
            $students = $guardian->studentLinks
                ->map(fn ($link) => $studentsByTenant->get($guardian->tenant_id)?->get($link->person_id))
                ->filter()
                ->values()
                ->map(fn (Person $student) => [
                    'id' => $student->id,
                    'display_name' => $student->display_name,
                    'external_id' => $student->external_id,
                    'grade_level' => $student->grade_level,
                    'section' => $student->section,
                    'is_active' => $student->is_active,
                ]);

            return [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'phone_number' => $guardian->phone_number,
                'is_active' => $guardian->is_active,
                'tenant' => $guardian->tenant ? [
                    'id' => $guardian->tenant->id,
                    'name' => $guardian->tenant->name,
                    'code' => $guardian->tenant->code,
                ] : null,
                'students' => $students,
            ];
        });

        return Inertia::render('Platform/guardian-phone-lookup/guardian-phone-lookup-screen', [
            'guardianAccounts' => $guardianAccounts,
            'filters' => ['phone_number' => $phoneNumber],
        ]);
    }

    /**
     * @param  Collection<int, ParentAccount>  $guardianAccounts
     * @return Collection<string, Collection<string, Person>>
     */
    private function studentsByTenant(Collection $guardianAccounts): Collection
    {
        $tenantIdsByStudent = $guardianAccounts
            ->groupBy('tenant_id')
            ->map(fn (Collection $guardians) => $guardians->flatMap(
                fn (ParentAccount $guardian) => $guardian->studentLinks->pluck('person_id'),
            )->unique()->values());

        $tenants = Tenant::query()->whereIn('id', $tenantIdsByStudent->keys())->get()->keyBy('id');

        return $tenantIdsByStudent->map(function (Collection $studentIds, string $tenantId) use ($tenants): Collection {
            $tenant = $tenants->get($tenantId);

            if ($tenant === null || $studentIds->isEmpty()) {
                return collect();
            }

            TenantDatabase::use($tenant);

            return Person::allTenants()
                ->where('tenant_id', $tenantId)
                ->whereIn('id', $studentIds)
                ->where('person_type', 'student')
                ->get(['id', 'tenant_id', 'display_name', 'external_id', 'grade_level', 'section', 'is_active'])
                ->keyBy('id');
        });
    }
}
