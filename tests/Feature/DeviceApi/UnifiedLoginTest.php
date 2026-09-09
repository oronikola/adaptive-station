<?php

namespace Tests\Feature\DeviceApi;

use App\Models\ParentAccount;
use App\Models\SmsGatewayDevice;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The shared /api/v1/auth/login endpoint's two paths — see
 * App\Http\Controllers\Api\Auth\LoginController. A parent's globally-unique
 * login_id is tried first; a gateway device's username otherwise — the two
 * identifier spaces are disjoint, so no role selector is needed.
 */
class UnifiedLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_parent_logs_in_with_their_login_id(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'parent@example.com',
            'login_id' => 'TEST202600001',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'TEST202600001',
            'password' => 'secret123',
        ]);

        $response->assertOk()->assertJson([
            'role' => 'parent',
            'parent' => ['id' => $parent->id, 'email' => 'parent@example.com'],
        ]);
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_a_wrong_parent_password_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'parent@example.com',
            'login_id' => 'TEST202600001',
            'password' => Hash::make('secret123'),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'TEST202600001',
            'password' => 'wrong',
        ])->assertStatus(401);
    }

    public function test_the_same_email_can_belong_to_two_schools_and_login_id_disambiguates(): void
    {
        $tenantA = Tenant::factory()->create(['code' => 'schoola']);
        $tenantB = Tenant::factory()->create(['code' => 'schoolb']);
        $parentA = ParentAccount::factory()->create([
            'tenant_id' => $tenantA->id, 'email' => 'shared@example.test',
            'login_id' => 'SCHOOLA202600001', 'password' => Hash::make('password-a'),
        ]);
        $parentB = ParentAccount::factory()->create([
            'tenant_id' => $tenantB->id, 'email' => 'shared@example.test',
            'login_id' => 'SCHOOLB202600001', 'password' => Hash::make('password-b'),
        ]);

        $this->postJson('/api/v1/auth/login', ['identifier' => 'SCHOOLA202600001', 'password' => 'password-a'])
            ->assertOk()->assertJsonPath('parent.id', $parentA->id);
        $this->postJson('/api/v1/auth/login', ['identifier' => 'SCHOOLB202600001', 'password' => 'password-b'])
            ->assertOk()->assertJsonPath('parent.id', $parentB->id);
    }

    public function test_a_gateway_device_logs_in_without_a_school_code(): void
    {
        ['device' => $device] = SmsGatewayDevice::provision([
            'label' => 'Phone 01',
            'username' => 'phone01',
            'password' => 'devicepass123',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'devicepass123',
        ]);

        $response->assertOk()->assertJson([
            'role' => 'gateway_sender',
            'device' => ['id' => $device->id, 'label' => 'Phone 01'],
        ]);
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_a_deactivated_gateway_device_is_rejected(): void
    {
        ['device' => $device] = SmsGatewayDevice::provision([
            'label' => 'Phone 01',
            'username' => 'phone01',
            'password' => 'devicepass123',
        ]);
        $device->forceFill(['is_active' => false])->save();

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'devicepass123',
        ])->assertStatus(401);
    }

    public function test_a_wrong_gateway_device_password_is_rejected(): void
    {
        SmsGatewayDevice::provision([
            'label' => 'Phone 01',
            'username' => 'phone01',
            'password' => 'devicepass123',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'wrong',
        ])->assertStatus(401);
    }

    public function test_an_unknown_gateway_username_is_rejected(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'nope',
            'password' => 'whatever',
        ])->assertStatus(401);
    }

    public function test_a_gateway_device_token_from_login_works_on_the_claim_endpoint(): void
    {
        SmsGatewayDevice::provision([
            'label' => 'Phone 01',
            'username' => 'phone01',
            'password' => 'devicepass123',
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'devicepass123',
        ])->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$login->json('token'))
            ->postJson('/api/v1/device/sms/claim')
            ->assertOk();
    }

    public function test_a_gateway_device_can_log_out(): void
    {
        SmsGatewayDevice::provision([
            'label' => 'Phone 01',
            'username' => 'phone01',
            'password' => 'devicepass123',
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'devicepass123',
        ])->assertOk();
        $token = $login->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/logout')
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')
            ->assertStatus(401);
    }
}
