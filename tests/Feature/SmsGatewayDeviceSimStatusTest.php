<?php

namespace Tests\Feature;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStatus;
use App\Models\SmsGatewayDeviceToken;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;
use Tests\TestCase;

class SmsGatewayDeviceSimStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_gateway_reports_its_smart_sim_load_status(): void
    {
        $device = SmsGatewayDevice::create(['label' => 'Phone 01']);
        ['plaintext' => $token] = SmsGatewayDeviceToken::issueFor($device);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/device/sms/sim-statuses/0', [
                'carrier' => 'smart',
                'status' => 'has_load',
                'balance_centavos' => 5000,
                'source' => 'manual',
            ])
            ->assertOk()
            ->assertJsonPath('sim_status.status', 'has_load')
            ->assertJsonPath('sim_status.balance_centavos', 5000);

        $this->assertDatabaseHas('sms_gateway_device_sim_statuses', [
            'device_id' => $device->id,
            'sim_slot' => 0,
            'carrier' => 'smart',
            'status' => 'has_load',
        ]);
    }

    public function test_a_phone_with_both_sims_marked_no_load_cannot_claim_messages(): void
    {
        $device = SmsGatewayDevice::create(['label' => 'Phone 01']);
        ['plaintext' => $token] = SmsGatewayDeviceToken::issueFor($device);
        $tenant = Tenant::factory()->create();
        SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639171234567',
            'message' => 'Test message',
            'status' => SmsOutboxStatus::Pending,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        foreach ([0, 1] as $slot) {
            SmsGatewayDeviceSimStatus::create([
                'device_id' => $device->id,
                'sim_slot' => $slot,
                'carrier' => 'smart',
                'status' => 'no_load',
                'source' => 'manual',
                'checked_at' => Date::now(),
            ]);
        }

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim', ['sim_slot' => 0])
            ->assertOk()
            ->assertJsonPath('messages', []);
    }

    public function test_superadmin_fleet_view_shows_each_sim_load_status(): void
    {
        $admin = User::factory()->platformSuperAdmin()->create();
        $device = SmsGatewayDevice::create(['label' => 'Phone 01']);
        SmsGatewayDeviceSimStatus::create([
            'device_id' => $device->id,
            'sim_slot' => 0,
            'carrier' => 'smart',
            'status' => 'no_load',
            'source' => 'manual',
            'checked_at' => Date::now(),
        ]);

        $this->actingAs($admin)
            ->get(route('platform.sms-gateway.devices.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('devices.0.sim_statuses.0.sim_slot', 0)
                ->where('devices.0.sim_statuses.0.status', 'no_load'));
    }
}
