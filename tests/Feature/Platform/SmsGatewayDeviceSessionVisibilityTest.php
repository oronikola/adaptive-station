<?php

namespace Tests\Feature\Platform;

use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Covers SmsGatewayFleetSnapshot::build()'s session_signed_in_at field —
 * added so an admin can see *when* a device's active session started,
 * rather than a session swap (see SmsGatewayDeviceToken::issueFor()'s
 * docblock: logging in from a new phone silently revokes the old session)
 * being invisible on the fleet screen.
 */
class SmsGatewayDeviceSessionVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_device_with_no_session_shows_no_signed_in_time(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        SmsGatewayDevice::create(['label' => 'Phone 01']);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page->where('devices.0.session_signed_in_at', null));
    }

    public function test_logging_in_surfaces_the_sessions_start_time(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        ['device' => $device] = SmsGatewayDevice::provision(['label' => 'Phone 01', 'username' => 'phone01', 'password' => 'devicepass123']);

        $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'devicepass123',
        ])->assertOk();

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'));

        $response->assertInertia(fn ($page) => $page->has('devices.0.session_signed_in_at'));
        $token = SmsGatewayDeviceToken::where('device_id', $device->id)->whereNull('revoked_at')->sole();
        $this->assertNotNull($token);
    }

    public function test_a_second_login_replaces_the_sessions_signed_in_time(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        SmsGatewayDevice::provision(['label' => 'Phone 01', 'username' => 'phone01', 'password' => 'devicepass123']);

        $this->postJson('/api/v1/auth/login', ['identifier' => 'phone01', 'password' => 'devicepass123'])->assertOk();
        $this->travel(1)->hours();
        $this->postJson('/api/v1/auth/login', ['identifier' => 'phone01', 'password' => 'devicepass123'])->assertOk();

        // Only the newest login's token remains active — this screen must
        // never show more than one "signed in" time for the same device.
        $device = SmsGatewayDevice::where('username', 'phone01')->sole();
        $this->assertSame(1, SmsGatewayDeviceToken::where('device_id', $device->id)->whereNull('revoked_at')->count());

        $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'))
            ->assertInertia(fn ($page) => $page->has('devices.0.session_signed_in_at'));
    }

    public function test_logging_out_clears_the_signed_in_time(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        SmsGatewayDevice::provision(['label' => 'Phone 01', 'username' => 'phone01', 'password' => 'devicepass123']);

        $token = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'phone01',
            'password' => 'devicepass123',
        ])->assertOk()->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/logout')
            ->assertOk();

        $this->actingAs($platformAdmin)->get(route('platform.sms-gateway.devices.index'))
            ->assertInertia(fn ($page) => $page->where('devices.0.session_signed_in_at', null));
    }
}
