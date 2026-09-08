<?php

namespace App\Events;

use App\Models\TapEvent;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

/**
 * Fired once per linked parent from DispatchParentTapNotification, alongside
 * (not instead of) the push notification — this is what lets the parent
 * app's dashboard update live while it's actually open, without polling.
 * ShouldBroadcastNow (not the queued ShouldBroadcast) since this already
 * runs inside that queued job; no need for a second queue hop.
 */
class TapRecorded implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string $parentAccountId,
        public readonly TapEvent $tapEvent,
        public readonly string $studentName,
        public readonly ?string $stationName,
    ) {}

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('parent.'.$this->parentAccountId)];
    }

    public function broadcastAs(): string
    {
        return 'tap.recorded';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->tapEvent->id,
            'person_id' => $this->tapEvent->person_id,
            'student_name' => $this->studentName,
            'event_type' => $this->tapEvent->event_type->value,
            'occurred_at' => $this->tapEvent->occurred_at->toIso8601String(),
            'attendance_date_local' => $this->tapEvent->attendance_date_local->toDateString(),
            'station' => $this->stationName,
        ];
    }
}
