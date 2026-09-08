<?php

namespace Tests\Feature\ParentApi;

use App\Enums\TenantStatus;
use App\Models\ParentAccount;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ParentLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_credentials_issue_a_token(): void
    {
        $tenant = Tenant::factory()->create(['code' => 'stmarys']);
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'email' => 'guardian@example.test', 'password' => 'correct-password']);

        $response = $this->postJson('/api/v1/parent/login', [
            'school_code' => 'stmarys',
            'email' => 'guardian@example.test',
            'password' => 'correct-password',
        ]);

        $response->assertOk()->assertJsonPath('parent.id', $parent->id)->assertJsonStructure(['token']);
    }

    public function test_wrong_password_is_rejected(): void
    {
        $tenant = Tenant::factory()->create(['code' => 'stmarys']);
        ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'email' => 'guardian@example.test', 'password' => 'correct-password']);

        $this->postJson('/api/v1/parent/login', [
            'school_code' => 'stmarys',
            'email' => 'guardian@example.test',
            'password' => 'wrong-password',
        ])->assertStatus(401);
    }

    public function test_unknown_school_code_is_rejected(): void
    {
        $this->postJson('/api/v1/parent/login', [
            'school_code' => 'no-such-school',
            'email' => 'guardian@example.test',
            'password' => 'whatever',
        ])->assertStatus(401);
    }

    public function test_deactivated_parent_account_is_rejected(): void
    {
        $tenant = Tenant::factory()->create(['code' => 'stmarys']);
        ParentAccount::factory()->create([
            'tenant_id' => $tenant->id, 'email' => 'guardian@example.test',
            'password' => 'correct-password', 'is_active' => false,
        ]);

        $this->postJson('/api/v1/parent/login', [
            'school_code' => 'stmarys',
            'email' => 'guardian@example.test',
            'password' => 'correct-password',
        ])->assertStatus(401);
    }

    public function test_same_email_can_log_into_two_different_schools(): void
    {
        $tenantA = Tenant::factory()->create(['code' => 'school-a']);
        $tenantB = Tenant::factory()->create(['code' => 'school-b']);
        $parentA = ParentAccount::factory()->create(['tenant_id' => $tenantA->id, 'email' => 'shared@example.test', 'password' => 'password-a']);
        $parentB = ParentAccount::factory()->create(['tenant_id' => $tenantB->id, 'email' => 'shared@example.test', 'password' => 'password-b']);

        $this->postJson('/api/v1/parent/login', ['school_code' => 'school-a', 'email' => 'shared@example.test', 'password' => 'password-a'])
            ->assertOk()->assertJsonPath('parent.id', $parentA->id);
        $this->postJson('/api/v1/parent/login', ['school_code' => 'school-b', 'email' => 'shared@example.test', 'password' => 'password-b'])
            ->assertOk()->assertJsonPath('parent.id', $parentB->id);
    }

    public function test_suspended_tenant_rejects_login(): void
    {
        $tenant = Tenant::factory()->create(['code' => 'stmarys', 'status' => TenantStatus::Suspended]);
        ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'email' => 'guardian@example.test', 'password' => 'correct-password']);

        $this->postJson('/api/v1/parent/login', [
            'school_code' => 'stmarys',
            'email' => 'guardian@example.test',
            'password' => 'correct-password',
        ])->assertStatus(401);
    }
}
