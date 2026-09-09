<?php

namespace App\Console\Commands;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsOutboxMessage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Date;

/**
 * A tap-alert SMS that arrives very late is worse than one that never
 * arrives — expires anything still unresolved past its expires_at cutoff
 * (set at insert time in DispatchParentTapNotification) instead of letting
 * it send hours later.
 */
class ExpireStaleSmsOutbox extends Command
{
    protected $signature = 'sms:expire-stale-outbox';

    protected $description = 'Mark pending/claimed SMS outbox rows past their expiry as expired';

    public function handle(): int
    {
        $affected = SmsOutboxMessage::query()
            ->whereIn('status', [SmsOutboxStatus::Pending->value, SmsOutboxStatus::Claimed->value])
            ->where('expires_at', '<', Date::now())
            ->update(['status' => SmsOutboxStatus::Expired->value]);

        $this->info("Expired {$affected} stale SMS outbox row(s).");

        return self::SUCCESS;
    }
}
