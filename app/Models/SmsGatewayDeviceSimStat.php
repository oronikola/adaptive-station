<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV4;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Per-(device, SIM slot) daily send counters — split out from
 * sms_gateway_devices because a phone has two independent SIMs, each with
 * its own carrier-imposed daily cap (see config('services.sms_gateway.
 * daily_send_cap')); a single sent_today column on the device can't tell
 * SIM 1 apart from SIM 2. Only ever populated for devices running an app
 * build new enough to report which SIM it used (see
 * Api\Device\SmsGatewayController::reportStatus()) — an older device simply
 * never gets a row here, which read call sites must treat as "unknown", not
 * "zero sent".
 */
#[Fillable(['device_id', 'sim_slot', 'sent_today', 'delivered_today', 'failed_today', 'stats_date'])]
class SmsGatewayDeviceSimStat extends Model
{
    use HasUuidV4;

    protected $connection = 'mysql';

    protected function casts(): array
    {
        return [
            'stats_date' => 'date',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(SmsGatewayDevice::class, 'device_id');
    }

    /** 'ok' / 'near' (>=80% of the daily cap) / 'at' (>=100%) — see SmsGatewayDevice::capStatusFor(). */
    public function capStatus(): string
    {
        return SmsGatewayDevice::capStatusFor($this->sent_today);
    }

    /**
     * Finds-or-creates today's row for this (device, sim_slot), rolling the
     * counters over first if the stored stats_date has gone stale —
     * mirrors SmsGatewayDevice::resetDailyStatsIfNeeded()'s same reasoning,
     * just one level more granular.
     *
     * A device's two SIMs report status independently (and can send at the
     * same time), so two calls for the same device+slot can genuinely
     * overlap. lockForUpdate() serializes them against an existing row;
     * find-or-create the very first row for a given (device, sim_slot)
     * still races between two concurrent callers, so a duplicate-key insert
     * is caught and re-fetched (same pattern as TapEvent::acceptBatch()) —
     * without either of these, two concurrent read-then-increment calls can
     * read the same starting count and one increment is silently lost,
     * which is why this device's per-SIM totals used to under-count against
     * the device-level aggregate (see SmsGatewayDevice::increment() calls in
     * SmsGatewayController::reportStatus(), which are already atomic).
     */
    public static function incrementFor(string $deviceId, int $simSlot, string $counter): self
    {
        $today = SmsGatewayDevice::currentStatsDate();

        return DB::connection('mysql')->transaction(function () use ($deviceId, $simSlot, $counter, $today) {
            $stat = static::query()
                ->where('device_id', $deviceId)
                ->where('sim_slot', $simSlot)
                ->lockForUpdate()
                ->first();

            if ($stat === null) {
                try {
                    $stat = static::create([
                        'device_id' => $deviceId,
                        'sim_slot' => $simSlot,
                        'sent_today' => 0,
                        'delivered_today' => 0,
                        'failed_today' => 0,
                        'stats_date' => $today,
                    ]);
                } catch (QueryException $e) {
                    if ((int) ($e->errorInfo[1] ?? 0) !== 1062) {
                        throw $e;
                    }

                    $stat = static::query()
                        ->where('device_id', $deviceId)
                        ->where('sim_slot', $simSlot)
                        ->lockForUpdate()
                        ->firstOrFail();
                }
            }

            if ($stat->stats_date?->toDateString() !== $today) {
                $stat->forceFill([
                    'sent_today' => 0,
                    'delivered_today' => 0,
                    'failed_today' => 0,
                    'stats_date' => $today,
                ])->save();
            }

            $stat->increment($counter);

            return $stat;
        });
    }
}
