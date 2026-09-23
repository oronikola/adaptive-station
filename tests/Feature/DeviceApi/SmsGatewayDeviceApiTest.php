<?php

namespace Tests\Feature\DeviceApi;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceToken;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;
use Tests\TestCase;

class SmsGatewayDeviceApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeDevice(string $label = 'Phone 01'): array
    {
        $device = SmsGatewayDevice::create(['label' => $label]);
        ['plaintext' => $token] = SmsGatewayDeviceToken::issueFor($device);

        return compact('device', 'token');
    }

    private function makeOutboxRow(Tenant $tenant, array $overrides = []): SmsOutboxMessage
    {
        return SmsOutboxMessage::create(array_merge([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639171234567',
            'message' => 'Test tapped IN at 8:00 AM',
            'status' => SmsOutboxStatus::Pending,
            'expires_at' => Date::now()->addMinutes(30),
        ], $overrides));
    }

    public function test_missing_bearer_token_is_rejected(): void
    {
        $this->postJson('/api/v1/device/sms/claim')->assertStatus(401);
    }

    public function test_revoked_device_token_is_rejected(): void
    {
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        SmsGatewayDeviceToken::revoke($device->tokens()->first());

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')
            ->assertStatus(401);
    }

    public function test_a_deactivated_device_is_rejected_with_403(): void
    {
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        $device->forceFill(['is_active' => false])->save();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')
            ->assertStatus(403);
    }

    public function test_claiming_across_two_tenants_returns_rows_from_both_with_no_tenant_filter(): void
    {
        ['token' => $token] = $this->makeDevice();
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $this->makeOutboxRow($tenantA);
        $this->makeOutboxRow($tenantB);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim', ['batch_size' => 10])
            ->assertOk();

        $this->assertCount(2, $response->json('messages'));
    }

    public function test_a_claimed_row_is_marked_claimed_and_no_longer_claimable_by_another_device(): void
    {
        ['token' => $tokenA] = $this->makeDevice('Phone A');
        ['token' => $tokenB] = $this->makeDevice('Phone B');
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $first = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $this->assertCount(1, $first->json('messages'));

        $second = $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $this->assertCount(0, $second->json('messages'));
    }

    public function test_reporting_sent_marks_the_row_sent_and_updates_device_stats(): void
    {
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $messageId = $claim->json('messages.0.id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'sent'])
            ->assertOk();

        $this->assertSame(SmsOutboxStatus::Sent, SmsOutboxMessage::find($messageId)->status);
        $this->assertSame(1, $device->fresh()->sent_today);
    }

    public function test_reporting_status_after_gateway_midnight_resets_yesterdays_device_stats_before_incrementing(): void
    {
        config(['services.sms_gateway.timezone' => 'Asia/Manila']);
        $this->travelTo('2026-09-16 16:30:00');
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $row = $this->makeOutboxRow($tenant, [
            'status' => SmsOutboxStatus::Claimed,
            'claimed_by_device_id' => $device->id,
            'claimed_at' => Date::now(),
        ]);
        $device->forceFill([
            'sent_today' => 449,
            'stats_date' => '2026-09-16',
        ])->save();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$row->id}/status", [
                'status' => 'sent',
                'sim_slot' => 0,
            ])
            ->assertOk();

        $freshDevice = $device->fresh();
        $this->assertSame(1, $freshDevice->sent_today);
        $this->assertSame('2026-09-17', $freshDevice->stats_date->toDateString());
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', [
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 1,
            'stats_date' => '2026-09-17',
        ]);
    }

    public function test_reporting_sent_with_a_sim_slot_records_it_on_the_message_and_the_per_sim_counter(): void
    {
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $messageId = $claim->json('messages.0.id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'sent', 'sim_slot' => 1])
            ->assertOk();

        $this->assertSame(1, SmsOutboxMessage::find($messageId)->sim_slot);
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', [
            'device_id' => $device->id,
            'sim_slot' => 1,
            'sent_today' => 1,
        ]);
    }

    public function test_reporting_sent_without_a_sim_slot_still_works_for_an_older_app_build(): void
    {
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $messageId = $claim->json('messages.0.id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'sent'])
            ->assertOk();

        $this->assertNull(SmsOutboxMessage::find($messageId)->sim_slot);
        $this->assertSame(1, $device->fresh()->sent_today);
        $this->assertDatabaseCount('sms_gateway_device_sim_stats', 0);
    }

    public function test_a_failed_report_keeps_the_sim_slot_but_clears_the_claiming_device(): void
    {
        ['token' => $token] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $messageId = $claim->json('messages.0.id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'failed', 'sim_slot' => 0])
            ->assertOk();

        $fresh = SmsOutboxMessage::find($messageId);
        $this->assertSame(0, $fresh->sim_slot);
        $this->assertNull($fresh->claimed_by_device_id);
    }

    public function test_a_failed_report_retains_the_gateway_failure_reason(): void
    {
        ['token' => $token] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')
            ->assertOk();
        $messageId = $claim->json('messages.0.id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", [
                'status' => 'failed',
                'error' => 'Insufficient prepaid load.',
            ])
            ->assertOk();

        $this->assertDatabaseHas('sms_outbox', [
            'id' => $messageId,
            'last_error' => 'Insufficient prepaid load.',
        ]);
    }

    public function test_a_failed_report_stores_its_structured_failure_details(): void
    {
        ['token' => $token] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')
            ->assertOk();
        $messageId = $claim->json('messages.0.id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", [
                'status' => 'failed',
                'error' => 'carrier rejected SMS (code 42)',
                'android_result_code' => 1,
                'carrier_error_code' => 42,
                'gateway_app_version' => '1.0.2',
            ])
            ->assertOk();

        $this->assertDatabaseHas('sms_outbox', [
            'id' => $messageId,
            'failure_category' => 'Carrier rejected',
            'android_result_code' => 1,
            'carrier_error_code' => 42,
            'gateway_app_version' => '1.0.2',
        ]);
    }

    public function test_a_retried_sent_report_does_not_double_count_after_the_first_already_succeeded(): void
    {
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $messageId = $claim->json('messages.0.id');

        // A network hiccup can make the phone retry a report even though its
        // first call already reached the server and succeeded.
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'sent', 'sim_slot' => 0])
            ->assertOk();
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'sent', 'sim_slot' => 0])
            ->assertOk();

        $this->assertSame(1, $device->fresh()->sent_today);
        $this->assertDatabaseHas('sms_gateway_device_sim_stats', [
            'device_id' => $device->id,
            'sim_slot' => 0,
            'sent_today' => 1,
        ]);
    }

    public function test_reporting_delivered_after_sent_marks_the_row_delivered_and_updates_device_stats(): void
    {
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $messageId = $claim->json('messages.0.id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'sent'])
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'delivered'])
            ->assertOk();

        $fresh = SmsOutboxMessage::find($messageId);
        $this->assertSame(SmsOutboxStatus::Delivered, $fresh->status);
        $this->assertNotNull($fresh->delivered_at);
        $this->assertSame(1, $device->fresh()->delivered_today);
    }

    public function test_reporting_delivered_before_sent_is_rejected(): void
    {
        ['token' => $token] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $this->makeOutboxRow($tenant);

        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $messageId = $claim->json('messages.0.id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'delivered'])
            ->assertStatus(409);

        $this->assertSame(SmsOutboxStatus::Claimed, SmsOutboxMessage::find($messageId)->status);
    }

    public function test_a_device_cannot_report_status_on_a_row_it_did_not_claim(): void
    {
        ['token' => $tokenA] = $this->makeDevice('Phone A');
        ['token' => $tokenB] = $this->makeDevice('Phone B');
        $tenant = Tenant::factory()->create();
        $row = $this->makeOutboxRow($tenant, ['status' => SmsOutboxStatus::Pending]);

        $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();

        $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->postJson("/api/v1/device/sms/messages/{$row->id}/status", ['status' => 'sent'])
            ->assertStatus(404);
    }

    public function test_failed_reports_go_back_to_pending_until_max_attempts_then_dead_letter(): void
    {
        ['token' => $token] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $row = $this->makeOutboxRow($tenant);

        for ($attempt = 1; $attempt <= SmsOutboxMessage::MAX_ATTEMPTS; $attempt++) {
            $claim = $this->withHeader('Authorization', "Bearer {$token}")
                ->postJson('/api/v1/device/sms/claim')->assertOk();
            $this->assertCount(1, $claim->json('messages'), "expected a claimable row on attempt {$attempt}");
            $messageId = $claim->json('messages.0.id');

            $this->withHeader('Authorization', "Bearer {$token}")
                ->postJson("/api/v1/device/sms/messages/{$messageId}/status", ['status' => 'failed', 'error' => 'no service'])
                ->assertOk();

            $fresh = SmsOutboxMessage::find($messageId);
            if ($attempt < SmsOutboxMessage::MAX_ATTEMPTS) {
                $this->assertSame(SmsOutboxStatus::Pending, $fresh->status);
            } else {
                $this->assertSame(SmsOutboxStatus::Failed, $fresh->status);
            }
        }

        $finalClaim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $this->assertCount(0, $finalClaim->json('messages'));
    }

    public function test_reclaim_stale_claims_command_releases_an_abandoned_claim(): void
    {
        ['token' => $token, 'device' => $device] = $this->makeDevice();
        $tenant = Tenant::factory()->create();
        $row = $this->makeOutboxRow($tenant, [
            'status' => SmsOutboxStatus::Claimed,
            'claimed_by_device_id' => $device->id,
            'claimed_at' => Date::now()->subMinutes(10),
        ]);

        Artisan::call('sms:reclaim-stale-claims', ['--minutes' => 5]);

        $fresh = $row->fresh();
        $this->assertSame(SmsOutboxStatus::Pending, $fresh->status);
        $this->assertNull($fresh->claimed_by_device_id);

        $reclaimed = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $this->assertCount(1, $reclaimed->json('messages'));
    }

    public function test_expire_stale_outbox_command_expires_a_row_past_its_deadline(): void
    {
        $tenant = Tenant::factory()->create();
        $row = $this->makeOutboxRow($tenant, ['expires_at' => Date::now()->subMinute()]);

        Artisan::call('sms:expire-stale-outbox');

        $this->assertSame(SmsOutboxStatus::Expired, $row->fresh()->status);

        ['token' => $token] = $this->makeDevice();
        $claim = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/device/sms/claim')->assertOk();
        $this->assertCount(0, $claim->json('messages'));
    }
}
