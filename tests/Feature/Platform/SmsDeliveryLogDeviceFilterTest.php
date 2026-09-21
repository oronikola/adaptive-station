<?php

namespace Tests\Feature\Platform;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsGatewayDevice;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;
use Tests\TestCase;

class SmsDeliveryLogDeviceFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_filter_the_cross_school_log_by_phone(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $phoneA = SmsGatewayDevice::create(['label' => 'Phone A']);
        $phoneB = SmsGatewayDevice::create(['label' => 'Phone B']);

        SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => 'Sent by Phone A',
            'status' => SmsOutboxStatus::Sent,
            'claimed_by_device_id' => $phoneA->id,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000002',
            'message' => 'Sent by Phone B',
            'status' => SmsOutboxStatus::Sent,
            'claimed_by_device_id' => $phoneB->id,
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-log.index', [
            'device_id' => $phoneA->id,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('messages.total', 1)
            ->where('messages.data.0.phone_number', '+639170000001')
            ->where('messages.data.0.device.label', 'Phone A'));
    }

    public function test_the_device_filter_list_includes_every_fleet_phone(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        SmsGatewayDevice::create(['label' => 'Phone A']);
        SmsGatewayDevice::create(['label' => 'Phone B']);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-log.index'));

        $response->assertInertia(fn ($page) => $page->where('devices', fn ($devices) => count($devices) === 2));
    }

    public function test_it_exposes_a_gateway_failure_reason_for_the_correct_school(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $schoolWithFailure = Tenant::factory()->create();
        $otherSchool = Tenant::factory()->create();

        $failedMessage = SmsOutboxMessage::create([
            'tenant_id' => $schoolWithFailure->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000001',
            'message' => 'No-load failure',
            'status' => SmsOutboxStatus::Failed,
            'last_error' => 'Insufficient prepaid load.',
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        $failedMessage->forceFill(['failure_category' => 'Carrier rejected'])->save();
        SmsOutboxMessage::create([
            'tenant_id' => $otherSchool->id,
            'person_id' => (string) Str::uuid(),
            'parent_account_id' => (string) Str::uuid(),
            'phone_number' => '+639170000002',
            'message' => 'Other school failure',
            'status' => SmsOutboxStatus::Failed,
            'last_error' => 'Invalid recipient number.',
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-log.index', [
            'tenant_id' => $schoolWithFailure->id,
            'status' => 'failed',
        ]));

        $response->assertInertia(fn ($page) => $page
            ->where('messages.total', 1)
            ->where('messages.data.0.id', $failedMessage->id)
            ->where('messages.data.0.last_error', 'Insufficient prepaid load.')
            ->where('messages.data.0.failure_category', 'Carrier rejected')
            ->where('failureSummary.0', ['category' => 'Carrier rejected', 'count' => 1]));
    }

    /**
     * Covers the sent-vs-delivered gap stat added for diagnosing a SIM the
     * carrier is silently throttling — see
     * SmsDeliveryLogController::deviceStats()'s docblock. "sent" only means
     * the modem accepted it; a device stuck mostly at "sent" instead of
     * reaching "delivered" is the visible symptom of that, even though
     * nothing in the app itself errored.
     */
    public function test_it_surfaces_a_per_device_sent_vs_delivered_gap(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();
        $throttledPhone = SmsGatewayDevice::create(['label' => 'Throttled Phone']);
        $healthyPhone = SmsGatewayDevice::create(['label' => 'Healthy Phone']);

        // Throttled phone: 3 sent, only 1 ever confirmed delivered.
        SmsOutboxMessage::create(['tenant_id' => $tenant->id, 'person_id' => (string) Str::uuid(), 'parent_account_id' => (string) Str::uuid(), 'phone_number' => '+639170000001', 'message' => 'a', 'status' => SmsOutboxStatus::Delivered, 'claimed_by_device_id' => $throttledPhone->id, 'expires_at' => Date::now()->addMinutes(30)]);
        SmsOutboxMessage::create(['tenant_id' => $tenant->id, 'person_id' => (string) Str::uuid(), 'parent_account_id' => (string) Str::uuid(), 'phone_number' => '+639170000002', 'message' => 'a', 'status' => SmsOutboxStatus::Sent, 'claimed_by_device_id' => $throttledPhone->id, 'expires_at' => Date::now()->addMinutes(30)]);
        SmsOutboxMessage::create(['tenant_id' => $tenant->id, 'person_id' => (string) Str::uuid(), 'parent_account_id' => (string) Str::uuid(), 'phone_number' => '+639170000003', 'message' => 'a', 'status' => SmsOutboxStatus::Sent, 'claimed_by_device_id' => $throttledPhone->id, 'expires_at' => Date::now()->addMinutes(30)]);

        // Healthy phone: 2 sent, both confirmed delivered.
        SmsOutboxMessage::create(['tenant_id' => $tenant->id, 'person_id' => (string) Str::uuid(), 'parent_account_id' => (string) Str::uuid(), 'phone_number' => '+639170000004', 'message' => 'a', 'status' => SmsOutboxStatus::Delivered, 'claimed_by_device_id' => $healthyPhone->id, 'expires_at' => Date::now()->addMinutes(30)]);
        SmsOutboxMessage::create(['tenant_id' => $tenant->id, 'person_id' => (string) Str::uuid(), 'parent_account_id' => (string) Str::uuid(), 'phone_number' => '+639170000005', 'message' => 'a', 'status' => SmsOutboxStatus::Delivered, 'claimed_by_device_id' => $healthyPhone->id, 'expires_at' => Date::now()->addMinutes(30)]);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-log.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('deviceStats.0.label', 'Throttled Phone')
            ->where('deviceStats.0.sent', 2)
            ->where('deviceStats.0.delivered', 1)
            ->where('deviceStats.0.stuck_rate', 66.7)
            ->where('deviceStats.1.label', 'Healthy Phone')
            ->where('deviceStats.1.sent', 0)
            ->where('deviceStats.1.delivered', 2)
            // A whole-number float (0.0) collapses to a bare 0 once it
            // round-trips through JSON (PHP's json_encode drops the
            // fractional part without JSON_PRESERVE_ZERO_FRACTION) — 0, not
            // 0.0, is genuinely what the response contains here.
            ->where('deviceStats.1.stuck_rate', 0));
    }

    /** A device that has never sent anything shouldn't clutter the panel with a meaningless 0%. */
    public function test_a_device_with_no_sends_yet_is_omitted_from_the_gap_stat(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        SmsGatewayDevice::create(['label' => 'Brand New Phone']);

        $response = $this->actingAs($platformAdmin)->get(route('platform.sms-log.index'));

        $response->assertInertia(fn ($page) => $page->where('deviceStats', []));
    }
}
