<?php

namespace Tests\Feature;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\SmsGatewayDeviceToken;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;
use Tests\TestCase;

class SmsGatewayClaimCapTest extends TestCase
{
    use RefreshDatabase;

    private function deviceWithToken(): array
    {
        $device = SmsGatewayDevice::create(['label' => 'Dual SIM gateway']);
        ['plaintext' => $token] = SmsGatewayDeviceToken::issueFor($device);

        return compact('device', 'token');
    }

    private function queueMessages(Tenant $tenant, int $count): void
    {
        for ($index = 0; $index < $count; $index++) {
            SmsOutboxMessage::create([
                'tenant_id' => $tenant->id,
                'person_id' => (string) Str::uuid(),
                'parent_account_id' => (string) Str::uuid(),
                'phone_number' => '+639171234567',
                'message' => 'Tap alert',
                'status' => SmsOutboxStatus::Pending,
                'expires_at' => Date::now()->addMinutes(30),
            ]);
        }
    }

    public function test_a_sim_can_only_claim_its_remaining_daily_capacity(): void
    {
        config(['services.sms_gateway.daily_send_cap' => 450]);
        ['device' => $device, 'token' => $token] = $this->deviceWithToken();
        $tenant = Tenant::factory()->create();
        $this->queueMessages($tenant, 10);
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 449,
            'stats_date' => SmsGatewayDevice::currentStatsDate(),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim', ['sim_slot' => 0, 'batch_size' => 20])
            ->assertOk();

        $this->assertCount(1, $response->json('messages'));
        $this->assertFalse($response->json('capacity_exhausted'));
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', [
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 449,
            'reserved_today' => 1,
        ]);
    }

    public function test_a_capped_sim_does_not_stop_the_other_sim_from_claiming(): void
    {
        config(['services.sms_gateway.daily_send_cap' => 450]);
        ['device' => $device, 'token' => $token] = $this->deviceWithToken();
        $tenant = Tenant::factory()->create();
        $this->queueMessages($tenant, 1);
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 450,
            'stats_date' => SmsGatewayDevice::currentStatsDate(),
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim', ['sim_slot' => 0])
            ->assertOk()
            ->assertJsonPath('capacity_exhausted', true)
            ->assertJsonCount(0, 'messages');
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim', ['sim_slot' => 1])
            ->assertOk();

        $this->assertCount(1, $response->json('messages'));
        $this->assertDatabaseHas('sms_outbox', [
            'id' => $response->json('messages.0.id'),
            'claimed_sim_slot' => 1,
        ]);
    }

    public function test_a_failed_send_releases_its_sim_reservation_for_the_next_claim(): void
    {
        config(['services.sms_gateway.daily_send_cap' => 450]);
        ['device' => $device, 'token' => $token] = $this->deviceWithToken();
        $tenant = Tenant::factory()->create();
        $this->queueMessages($tenant, 1);
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 449,
            'stats_date' => SmsGatewayDevice::currentStatsDate(),
        ]);

        $firstClaim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim', ['sim_slot' => 0])
            ->assertOk();
        $messageId = $firstClaim->json('messages.0.id');
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'failed'])
            ->assertOk();

        $secondClaim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim', ['sim_slot' => 0])
            ->assertOk();

        $this->assertCount(1, $secondClaim->json('messages'));
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', [
            'device_id' => $device->id,
            'sim_slot' => 0,
            'reserved_today' => 1,
        ]);
    }

    public function test_the_stale_claim_reaper_releases_a_reserved_sim_slot(): void
    {
        ['device' => $device] = $this->deviceWithToken();
        $tenant = Tenant::factory()->create();
        $row = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639171234567',
            'message' => 'Tap alert',
            'status' => SmsOutboxStatus::Claimed,
            'claimed_by_device_id' => $device->id,
            'claimed_sim_slot' => 1,
            'claimed_at' => Date::now()->subMinutes(10),
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 1,
            'reserved_today' => 1,
            'stats_date' => SmsGatewayDevice::currentStatsDate(),
        ]);

        Artisan::call('sms:reclaim-stale-claims', ['--minutes' => 5]);

        $this->assertSame(SmsOutboxStatus::Pending, $row->fresh()->status);
        $this->assertNull($row->fresh()->claimed_sim_slot);
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', [
            'device_id' => $device->id,
            'sim_slot' => 1,
            'reserved_today' => 0,
        ]);
    }

    public function test_expiring_a_claimed_message_releases_its_reserved_sim_slot(): void
    {
        ['device' => $device] = $this->deviceWithToken();
        $tenant = Tenant::factory()->create();
        $row = SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639171234567',
            'message' => 'Tap alert',
            'status' => SmsOutboxStatus::Claimed,
            'claimed_by_device_id' => $device->id,
            'claimed_sim_slot' => 1,
            'claimed_at' => Date::now(),
            'expires_at' => Date::now()->subMinute(),
        ]);
        SmsGatewayDeviceSimStat::create([
            'device_id' => $device->id,
            'sim_slot' => 1,
            'reserved_today' => 1,
            'stats_date' => SmsGatewayDevice::currentStatsDate(),
        ]);

        Artisan::call('sms:expire-stale-outbox');

        $this->assertSame(SmsOutboxStatus::Expired, $row->fresh()->status);
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', [
            'device_id' => $device->id,
            'sim_slot' => 1,
            'reserved_today' => 0,
        ]);
    }

    public function test_a_claim_without_a_sim_slot_is_rejected(): void
    {
        ['token' => $token] = $this->deviceWithToken();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sim_slot']);
    }
}
