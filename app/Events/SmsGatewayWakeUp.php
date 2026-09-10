<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

/**
 * A pure "check the queue now" nudge for the SMS gateway device fleet — not
 * a data payload. Fired once from DispatchParentTapNotification after at
 * least one SmsOutboxMessage was created, so an idle device's foreground
 * loop can skip the rest of its 15s poll wait and call /claim immediately
 * instead. Deliberately carries no message content: the atomic
 * FOR-UPDATE-SKIP-LOCKED claim in SmsOutboxMessage::claimBatch() is what
 * actually hands out work, so this only ever shortens the wait before a
 * device asks — it can never cause a double-claim or skip that mechanism.
 *
 * Broadcast on a public channel (no per-device auth) since the payload has
 * nothing sensitive in it and every gateway device is meant to hear it —
 * unlike parent.{id} in routes/channels.php, there's no single owner to
 * authorize against; ShouldBroadcastNow (not queued ShouldBroadcast) since
 * this already runs inside DispatchParentTapNotification's own queued job.
 */
class SmsGatewayWakeUp implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new Channel('sms-gateway')];
    }

    public function broadcastAs(): string
    {
        return 'sms.queued';
    }
}
