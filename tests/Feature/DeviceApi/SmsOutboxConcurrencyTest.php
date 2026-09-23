<?php

namespace Tests\Feature\DeviceApi;

use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceToken;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Deliberately does NOT use RefreshDatabase: that trait wraps the whole test
 * in one transaction on the default connection, which would make rows
 * inserted here invisible/unlockable to a genuinely separate second
 * connection — defeating the point of this test. Cleans up manually
 * instead.
 */
class SmsOutboxConcurrencyTest extends TestCase
{
    private array $tenantIds = [];

    protected function tearDown(): void
    {
        DB::connection('mysql')->table('sms_outbox')->whereIn('tenant_id', $this->tenantIds)->delete();
        DB::connection('mysql')->table('tenants')->whereIn('id', $this->tenantIds)->delete();
        DB::connection('mysql')->table('sms_gateway_device_tokens')->delete();
        DB::connection('mysql')->table('sms_gateway_devices')->delete();

        parent::tearDown();
    }

    public function test_a_row_locked_by_a_concurrent_transaction_is_never_claimed_by_another_device(): void
    {
        $device = SmsGatewayDevice::create(['label' => 'Phone B']);
        SmsGatewayDeviceToken::issueFor($device);

        $tenant = Tenant::factory()->create();
        $this->tenantIds[] = $tenant->id;

        for ($i = 0; $i < 20; $i++) {
            SmsOutboxMessage::create([
                'tenant_id' => $tenant->id,
                'person_id' => (string) Str::uuid(),
                'parent_account_id' => (string) Str::uuid(),
                'phone_number' => '+639171234567',
                'message' => 'Test tapped IN at 8:00 AM',
                'status' => 'pending',
                'expires_at' => Date::now()->addMinutes(30),
            ]);
        }

        // Picked without a lock first, then locked by primary key below —
        // locking by PK is a direct lookup with no sort/scan involved, so
        // it locks exactly these 10 rows. (Locking via an ORDER BY + LIMIT
        // scan instead would force a filesort, and FOR UPDATE + filesort
        // locks every row it reads to sort, not just the ones LIMIT keeps —
        // the exact bug this design avoids in claimBatch() itself; see its
        // docblock.)
        $idsToLock = SmsOutboxMessage::where('tenant_id', $tenant->id)
            ->orderBy('created_at')
            ->limit(10)
            ->pluck('id');

        // A second, genuinely separate connection to the same database —
        // proves skipLocked() actually skips rows a concurrent transaction
        // is holding, rather than blocking on or double-claiming them.
        config(['database.connections.mysql_secondary' => config('database.connections.mysql')]);
        $second = DB::connection('mysql_secondary');

        $second->beginTransaction();
        try {
            // FORCE INDEX (PRIMARY): on this tiny fixture table (no real
            // statistics), MariaDB's optimizer sometimes picks a full scan
            // of ix_sms_outbox_claim over direct primary-key lookups for a
            // WHERE id IN (...) — locking every row it scans along the way
            // instead of just the 10 requested. A production-sized table
            // wouldn't need this hint; it's here purely to make the test
            // fixture behave the way a real table naturally would.
            $placeholders = implode(',', array_fill(0, $idsToLock->count(), '?'));
            $lockedIds = collect($second->select(
                "select id from sms_outbox force index (`primary`) where id in ({$placeholders}) for update",
                $idsToLock->all(),
            ))->pluck('id');

            $claimed = SmsOutboxMessage::claimBatch($device, 0, 20);
        } finally {
            $second->rollBack();
            $second->disconnect();
        }

        $claimedIds = $claimed->pluck('id')->all();
        $this->assertEmpty(
            array_intersect($lockedIds->all(), $claimedIds),
            'a row locked by a concurrent transaction must never be claimed',
        );
        $this->assertCount(10, $claimedIds, 'the 10 unlocked rows should all be claimable');
    }
}
