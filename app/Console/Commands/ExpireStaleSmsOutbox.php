<?php

namespace App\Console\Commands;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsOutboxMessage;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

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
        $now = Date::now();
        $affected = SmsOutboxMessage::query()
            ->where('status', SmsOutboxStatus::Pending->value)
            ->where('expires_at', '<', Date::now())
            ->update(['status' => SmsOutboxStatus::Expired->value]);

        SmsOutboxMessage::query()
            ->where('status', SmsOutboxStatus::Claimed->value)
            ->where('expires_at', '<', $now)
            ->orderBy('id')
            ->chunkById(100, function (Collection $claims) use (&$affected, $now) {
                foreach ($claims as $claim) {
                    $expired = DB::connection('mysql')->transaction(function () use ($claim, $now) {
                        $row = SmsOutboxMessage::query()->lockForUpdate()->find($claim->id);

                        if ($row === null || $row->status !== SmsOutboxStatus::Claimed || $row->expires_at?->gte($now)) {
                            return false;
                        }

                        $row->releaseClaimReservation();
                        $row->forceFill([
                            'status' => SmsOutboxStatus::Expired,
                            'claimed_by_device_id' => null,
                            'claimed_sim_slot' => null,
                            'claimed_at' => null,
                        ])->save();

                        return true;
                    });

                    $affected += $expired ? 1 : 0;
                }
            });

        $this->info("Expired {$affected} stale SMS outbox row(s).");

        return self::SUCCESS;
    }
}
