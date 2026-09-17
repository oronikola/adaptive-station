<?php

namespace Tests\Feature\Portal;

use App\Enums\PersonType;
use App\Models\AuditLog;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\Tenant;
use App\Models\User;
use App\Policies\ParentAccountPolicy;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ParentAccountManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_the_parent_creation_screen(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->get(route('portal.parents.create'))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/parents/parent-form-screen')
            ->where('parent', null)
            ->has('linkedStudents', 0));
    }

    public function test_admin_creates_a_separate_parent_with_multiple_approved_students(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $students = Person::factory()->count(2)->create(['tenant_id' => $tenant->id]);
        $this->actingAs($admin)->post(route('portal.parents.store'), $this->payload($students->modelKeys()) + [
            'tenant_id' => 'untrusted-school', 'role' => 'platform_super_admin', 'is_active' => false,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $parent = ParentAccount::query()->sole();
        $this->assertSame($tenant->id, $parent->tenant_id);
        $this->assertTrue($parent->is_active);
        $this->assertTrue(Hash::check('parent-password-123', $parent->password));
        $this->assertSame(2, $parent->studentLinks()->count());
        $this->assertSame([$admin->id], $parent->studentLinks()->pluck('approved_by')->unique()->values()->all());
        $this->assertDatabaseMissing('users', ['email' => 'guardian@example.test']);
        $this->assertArrayNotHasKey('password', $parent->toArray());
        $this->assertSame(2, $parent->authorizedStudents()->count());
        $audit = AuditLog::query()->where('action', 'parent.created')->sole();
        $this->assertCount(2, $audit->metadata['linked_student_ids']);
        $this->assertStringNotContainsString('parent-password-123', $audit->toJson());
        $this->get(route('portal.parents.edit', $parent))->assertInertia(fn (Assert $page) => $page
            ->component('Admin/parents/parent-form-screen')->has('linkedStudents', 2)->missing('parent.password'));
    }

    public function test_linking_rejects_foreign_students_staff_deleted_students_and_duplicates(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $foreign = Person::factory()->create();
        $staff = Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Staff]);
        $deleted = Person::factory()->create(['tenant_id' => $tenant->id, 'deleted_at' => now()]);
        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        foreach ([[$foreign->id], [$staff->id], [$deleted->id], [$student->id, $student->id]] as $ids) {
            $this->actingAs($admin)->post(route('portal.parents.store'), $this->payload($ids))
                ->assertSessionHasErrors('student_ids.0');
        }
        $this->assertDatabaseCount('parent_accounts', 0);
        $this->assertDatabaseCount('parent_student_links', 0);
    }

    public function test_parent_can_have_no_links_but_cannot_access_unapproved_students(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Person::factory()->create(['tenant_id' => $tenant->id]);
        $this->actingAs($admin)->post(route('portal.parents.store'), $this->payload())
            ->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame(0, ParentAccount::query()->sole()->authorizedStudents()->count());
    }

    public function test_update_removes_old_links_preserves_password_and_allows_multiple_guardians(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $students = Person::factory()->count(2)->create(['tenant_id' => $tenant->id]);
        $this->actingAs($admin)->post(route('portal.parents.store'), $this->payload([$students[0]->id]))->assertRedirect();
        $parent = ParentAccount::query()->sole();
        $hash = $parent->password;
        $data = $this->payload([$students[1]->id]);
        $data['password'] = '';
        $data['password_confirmation'] = '';
        $data['name'] = 'Updated Guardian';
        $this->put(route('portal.parents.update', $parent), $data)->assertSessionHasNoErrors()->assertRedirect();
        $this->assertSame($hash, $parent->fresh()->password);
        $this->assertSame('Updated Guardian', $parent->fresh()->name);
        $this->assertSame([$students[1]->id], $parent->authorizedStudents()->pluck('id')->all());

        $second = $this->payload([$students[1]->id]);
        $second['email'] = 'second-guardian@example.test';
        $this->post(route('portal.parents.store'), $second)->assertSessionHasNoErrors()->assertRedirect();
        $this->assertDatabaseCount('parent_student_links', 2);
        $audit = AuditLog::query()->where('action', 'parent.updated')->sole();
        $this->assertSame([$students[0]->id], $audit->metadata['unlinked_student_ids']);
    }

    public function test_password_can_be_reset_without_exposing_it_in_the_session(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $data = $this->payload();
        $data['email'] = $parent->email;
        $this->actingAs($admin)->put(route('portal.parents.update', $parent), $data)
            ->assertSessionHasNoErrors()->assertRedirect();
        $this->assertTrue(Hash::check($data['password'], $parent->fresh()->password));
        $this->assertFalse(session()->has('temporaryPassword'));
        $this->assertSame($data['password'], $parent->fresh()->password_plaintext);
    }

    /** The parents index page shows each parent's current plaintext password (alongside their login_id) so staff can hand out or re-confirm credentials without a separate recovery flow. */
    public function test_the_index_page_shows_the_current_plaintext_password(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($admin)->get(route('portal.parents.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('parents.data.0.password_plaintext', $parent->password_plaintext));
    }

    public function test_deactivation_revokes_access_for_an_existing_instance_and_reactivation_restores_it(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        $this->actingAs($admin)->post(route('portal.parents.store'), $this->payload([$student->id]))->assertRedirect();
        $parent = ParentAccount::query()->sole();
        $this->patch(route('portal.parents.status', $parent), ['is_active' => false])->assertRedirect();
        $this->assertSame(0, $parent->authorizedStudents()->count());
        $this->assertSame(1, $parent->studentLinks()->count());
        $this->patch(route('portal.parents.status', $parent), ['is_active' => true])->assertRedirect();
        $this->assertSame(1, $parent->authorizedStudents()->count());
        $student->update(['is_active' => false]);
        $this->assertSame(0, $parent->authorizedStudents()->count());
    }

    public function test_admin_cannot_read_or_modify_another_schools_parent(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $parent = ParentAccount::factory()->create();
        $this->actingAs($admin)->get(route('portal.parents.edit', $parent))->assertNotFound();
        $this->put(route('portal.parents.update', $parent), $this->payload())->assertNotFound();
        $this->patch(route('portal.parents.status', $parent), ['is_active' => false])->assertNotFound();
        $this->get(route('portal.parents.index'))->assertInertia(fn (Assert $page) => $page->has('parents.data', 0));
        $this->assertTrue(ParentAccount::allTenants()->findOrFail($parent->id)->is_active);
    }

    public function test_guest_and_operator_cannot_use_parent_management_endpoints(): void
    {
        $this->get(route('portal.parents.index'))->assertRedirect(route('login'));
        $tenant = Tenant::factory()->create();
        $operator = User::factory()->tenantOperator($tenant)->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $this->actingAs($operator)->get(route('portal.parents.index'))->assertForbidden();
        $this->get(route('portal.parents.create'))->assertForbidden();
        $this->get(route('portal.parents.students'))->assertForbidden();
        $this->get(route('portal.parents.edit', $parent))->assertForbidden();
        $this->post(route('portal.parents.store'), $this->payload())->assertForbidden();
        $this->put(route('portal.parents.update', $parent), $this->payload())->assertForbidden();
        $this->patch(route('portal.parents.status', $parent), ['is_active' => false])->assertForbidden();
    }

    public function test_parent_policy_requires_active_school_admin_from_the_same_school(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $policy = new ParentAccountPolicy;
        $this->assertTrue($policy->create($admin));
        $this->assertTrue($policy->update($admin, $parent));
        $this->assertFalse($policy->update(User::factory()->tenantAdmin()->create(), $parent));
        $this->assertFalse($policy->create(User::factory()->tenantOperator($tenant)->create()));
        $this->assertFalse($policy->create(User::factory()->platformSuperAdmin()->create()));
        $admin->is_active = false;
        $this->assertFalse($policy->create($admin));
    }

    public function test_student_search_returns_only_school_students_with_a_bounded_result_set(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        Person::factory()->count(31)->create(['tenant_id' => $tenant->id, 'display_name' => 'Matching Student']);
        Person::factory()->create(['display_name' => 'Foreign Student']);
        Person::factory()->create(['tenant_id' => $tenant->id, 'person_type' => PersonType::Staff, 'display_name' => 'Staff']);
        $this->actingAs($admin)->getJson(route('portal.parents.students'))->assertOk()->assertJsonCount(30, 'students')
            ->assertJsonMissing(['display_name' => 'Foreign Student'])->assertJsonMissing(['display_name' => 'Staff']);
        $this->getJson(route('portal.parents.students', ['search' => 'does-not-exist']))->assertOk()->assertJsonCount(0, 'students');
    }

    public function test_duplicate_email_is_rejected_within_school_but_can_exist_in_another_school(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        ParentAccount::factory()->create(['email' => 'guardian@example.test']);
        $this->actingAs($admin)->post(route('portal.parents.store'), $this->payload())->assertSessionHasNoErrors()->assertRedirect();
        $data = $this->payload();
        $data['email'] = 'GUARDIAN@EXAMPLE.TEST';
        $this->post(route('portal.parents.store'), $data)->assertSessionHasErrors([
            'email' => 'A parent account with this email already exists in your school.',
        ]);
    }

    public function test_invalid_details_and_status_do_not_change_accounts(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $this->actingAs($admin)->post(route('portal.parents.store'), [])->assertSessionHasErrors(['name', 'email', 'password', 'student_ids']);
        $data = $this->payload();
        $data['password'] = 'short';
        $data['password_confirmation'] = 'different';
        $this->post(route('portal.parents.store'), $data)->assertSessionHasErrors('password');
        $this->assertDatabaseCount('parent_accounts', 0);
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $this->patch(route('portal.parents.status', $parent), ['is_active' => 'invalid'])->assertSessionHasErrors('is_active');
        $this->assertTrue($parent->fresh()->is_active);
    }

    public function test_authorized_students_fail_closed_without_context_or_when_school_is_suspended(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();
        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        $this->actingAs($admin)->post(route('portal.parents.store'), $this->payload([$student->id]))->assertRedirect();
        $parent = ParentAccount::query()->sole();
        app(TenantContext::class)->set(null);
        $this->assertSame(0, $parent->authorizedStudents()->count());
        app(TenantContext::class)->set($tenant->id);
        $tenant->update(['status' => 'suspended']);
        $this->assertSame(0, $parent->authorizedStudents()->count());
    }

    public function test_parent_password_does_not_authenticate_as_a_staff_user(): void
    {
        $parent = ParentAccount::factory()->create();
        $this->post(route('login'), ['email' => $parent->email, 'password' => 'test-parent-password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    private function payload(array $studentIds = []): array
    {
        return [
            'name' => 'Test Guardian',
            'email' => 'guardian@example.test',
            'password' => 'parent-password-123',
            'password_confirmation' => 'parent-password-123',
            'student_ids' => $studentIds,
        ];
    }
}
