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
}
