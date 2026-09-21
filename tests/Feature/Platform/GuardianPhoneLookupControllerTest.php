<?php

namespace Tests\Feature\Platform;

use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GuardianPhoneLookupControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_guardian_phone_numbers_with_their_linked_students(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create(['name' => 'North High School']);
        $guardian = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Maria Santos',
            'phone_number' => '+639171234567',
        ]);
        $student = Person::factory()->create([
            'tenant_id' => $tenant->id,
            'display_name' => 'Ana Santos',
            'external_id' => 'STU-100',
            'grade_level' => 'Grade 7',
            'section' => 'Rizal',
        ]);
        $guardian->studentLinks()->create(['person_id' => $student->id]);

        $this->actingAs($platformAdmin)
            ->get(route('platform.guardian-phone-lookup.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Platform/guardian-phone-lookup/guardian-phone-lookup-screen')
                ->where('guardianAccounts.total', 1)
                ->where('guardianAccounts.data.0.phone_number', '+639171234567')
                ->where('guardianAccounts.data.0.name', 'Maria Santos')
                ->where('guardianAccounts.data.0.tenant.name', 'North High School')
                ->where('guardianAccounts.data.0.students.0.display_name', 'Ana Santos')
                ->where('guardianAccounts.data.0.students.0.external_id', 'STU-100'));
    }

    public function test_it_filters_guardians_by_phone_number(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639171234567']);
        ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639189876543']);

        $this->actingAs($platformAdmin)
            ->get(route('platform.guardian-phone-lookup.index', ['phone_number' => '1234']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('guardianAccounts.total', 1)
                ->where('guardianAccounts.data.0.phone_number', '+639171234567')
                ->where('filters.phone_number', '1234'));
    }

    public function test_it_forbids_non_platform_administrators(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantAdmin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($tenantAdmin)
            ->get(route('platform.guardian-phone-lookup.index'))
            ->assertForbidden();
    }
}
