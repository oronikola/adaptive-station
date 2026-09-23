<?php

namespace App\Console\Commands;

use App\Enums\SmsOutboxStatus;
use App\Models\SmsOutboxMessage;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Safety net for a gateway phone that crashes or loses signal mid-batch:
 * SmsOutboxMessage::claimBatch() already opportunistically re-claims
 * lease-expired rows inline, so this is a backstop, not the only path.
 */
class ReclaimStaleSmsClaims extends Command
{
    protected $signature = 'sms:reclaim-stale-claims {--minutes=}';

    protected $description = 'Release SMS outbox claims that were never resolved within the lease window';

    public function handle(): int
    {
        $minutes = (int) ($this->option('minutes') ?? SmsOutboxMessage::CLAIM_LEASE_MINUTES);
        $cutoff = Date::now()->subMinutes($minutes);

        $claims = SmsOutboxMessage::query()
            ->where('status', SmsOutboxStatus::Claimed->value)
            ->where('claimed_at', '<', $cutoff)
            ->orderBy('id');
        $affected = 0;

        $claims->chunkById(100, function (Collection $claims) use (&$affected, $cutoff) {
            foreach ($claims as $claim) {
                $reclaimed = DB::connection('mysql')->transaction(function () use ($claim, $cutoff) {
                    $row = SmsOutboxMessage::query()->lockForUpdate()->find($claim->id);

                    if ($row === null || $row->status !== SmsOutboxStatus::Claimed || $row->claimed_at?->gte($cutoff)) {
                        return false;
                    }

                    $row->releaseClaimReservation();
                    $row->forceFill([
                        'status' => SmsOutboxStatus::Pending,
                        'claimed_by_device_id' => null,
                        'claimed_sim_slot' => null,
                        'claimed_at' => null,
                    ])->save();

                    return true;
                });

                $affected += $reclaimed ? 1 : 0;
            }
        });

        if ($affected > 0) {
            Log::warning('Reclaimed stale SMS outbox claims.', ['count' => $affected]);
        }

        $this->info("Reclaimed {$affected} stale SMS outbox claim(s).");

        return self::SUCCESS;
    }
}
