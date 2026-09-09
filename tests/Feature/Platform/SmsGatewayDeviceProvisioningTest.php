<?php

namespace Tests\Feature\Platform;

use App\Models\SmsGatewayDevice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SmsGatewayDeviceProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_create_a_device_account_that_can_then_log_in(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        $storeResponse = $this->actingAs($platformAdmin)->post(route('platform.sms-gateway.devices.store'), [
            'label' => 'Phone 01',
            'username' => 'phone01',
        ]);
        $storeResponse->assertRedirect(route('platform.sms-gateway.devices.index'));
        $storeResponse->assertSessionHas('devicePassword');

        $password = session('devicePassword');
        $device = SmsGatewayDevice::where('username', 'phone01')->firstOrFail();
        $this->assertSame('Phone 01', $device->label);
        $this->assertTrue(Hash::check($password, $device->password));

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => $password,
        ])->assertOk()->assertJson(['role' => 'gateway_sender']);
    }

    public function test_username_must_be_unique(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        SmsGatewayDevice::provision(['label' => 'Phone A', 'username' => 'dupe']);

        $this->actingAs($platformAdmin)->post(route('platform.sms-gateway.devices.store'), [
            'label' => 'Phone B',
            'username' => 'dupe',
        ])->assertSessionHasErrors('username');
    }

    public function test_reset_password_issues_a_new_working_password(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        ['device' => $device] = SmsGatewayDevice::provision(['label' => 'Phone 01', 'username' => 'phone01', 'password' => 'oldpassword']);

        $response = $this->actingAs($platformAdmin)
            ->patch(route('platform.sms-gateway.devices.reset-password', $device->id));

        $response->assertRedirect(route('platform.sms-gateway.devices.index'));
        $newPassword = session('devicePassword');
        $this->assertNotSame('oldpassword', $newPassword);

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'oldpassword',
        ])->assertStatus(401);

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => $newPassword,
        ])->assertOk();
    }

    public function test_revoking_a_device_deactivates_it_and_blocks_future_logins(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        ['device' => $device] = SmsGatewayDevice::provision(['label' => 'Phone 01', 'username' => 'phone01', 'password' => 'devicepass']);

        $this->actingAs($platformAdmin)
            ->patch(route('platform.sms-gateway.devices.revoke', $device->id))
            ->assertRedirect(route('platform.sms-gateway.devices.index'));

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'devicepass',
        ])->assertStatus(401);
    }
}
