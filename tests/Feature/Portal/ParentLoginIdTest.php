<?php

namespace Tests\Feature\Portal;

use App\Models\ParentAccount;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class ParentLoginIdTest extends TestCase
{
    use RefreshDatabase;

    public function test_generated_login_ids_are_sequential_per_tenant_and_year(): void
    {
        Date::setTestNow('2026-05-01');
        $tenant = Tenant::factory()->create(['code' => 'knhs']);

        $first = ParentAccount::generateLoginId($tenant->id);
        $second = ParentAccount::generateLoginId($tenant->id);

        $this->assertSame('KNHS202600001', $first);
        $this->assertSame('KNHS202600002', $second);
    }

    public function test_different_tenants_get_independent_sequences_in_the_same_year(): void
    {
        Date::setTestNow('2026-05-01');
        $tenantA = Tenant::factory()->create(['code' => 'knhs']);
        $tenantB = Tenant::factory()->create(['code' => 'pcc']);

        $this->assertSame('KNHS202600001', ParentAccount::generateLoginId($tenantA->id));
        $this->assertSame('PCC202600001', ParentAccount::generateLoginId($tenantB->id));
    }

    public function test_the_sequence_resets_each_year(): void
    {
        $tenant = Tenant::factory()->create(['code' => 'knhs']);

        Date::setTestNow('2026-12-31');
        $this->assertSame('KNHS202600001', ParentAccount::generateLoginId($tenant->id));

        Date::setTestNow('2027-01-01');
        $this->assertSame('KNHS202700001', ParentAccount::generateLoginId($tenant->id));
    }

    public function test_provision_sets_a_login_id(): void
    {
        $tenant = Tenant::factory()->create(['code' => 'knhs']);

        ['account' => $account] = ParentAccount::provision($tenant->id, [
            'name' => 'Maria Santos', 'email' => 'maria@example.test',
        ]);

        $this->assertStringStartsWith('KNHS', $account->login_id);
        $this->assertNotNull($account->login_id);
    }

    public function test_manual_portal_creation_sets_a_login_id(): void
    {
        $tenant = Tenant::factory()->create(['code' => 'knhs']);
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->post(route('portal.parents.store'), [
            'name' => 'Test Guardian', 'email' => 'guardian@example.test',
            'password' => 'parent-password-123', 'password_confirmation' => 'parent-password-123',
            'student_ids' => [],
        ])->assertSessionHasNoErrors();

        $parent = ParentAccount::query()->sole();
        $this->assertStringStartsWith('KNHS', $parent->login_id);
    }
}
