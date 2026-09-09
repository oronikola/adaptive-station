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
 * App\Http\Controllers\Api\Auth\LoginController. `school_code` present
 * decides parent vs gateway-sender; there's no separate role selector.
 */
class UnifiedLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_parent_logs_in_with_a_school_code(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'parent@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'school_code' => $tenant->code,
            'identifier' => 'parent@example.com',
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
            'password' => Hash::make('secret123'),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'school_code' => $tenant->code,
            'identifier' => 'parent@example.com',
            'password' => 'wrong',
        ])->assertStatus(401);
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
