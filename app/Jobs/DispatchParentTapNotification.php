<?php

namespace App\Jobs;

use App\Enums\TapEventType;
use App\Enums\TenantStatus;
use App\Events\SmsGatewayWakeUp;
use App\Events\TapRecorded;
use App\Models\ParentStudentLink;
use App\Models\Person;
use App\Models\SmsOutboxMessage;
use App\Models\TapEvent;
use App\Models\Tenant;
use App\Services\FcmClient;
use App\Support\TenantContext;
use App\Support\TenantDatabase;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;

/**
 * Sends an IN/OUT push to every parent linked to the tapped student, fired
 * once per newly-accepted tap event (see TapEvent::acceptBatch() — never for
 * an idempotent duplicate resubmission of an already-accepted tap, and never
 * for a tap that resolved no student, e.g. an unrecognized card). Offline
 * kiosk taps go through this same path once they reach the server via the
 * batch endpoint, satisfying "notify after syncing" without a separate code
 * path.
 */
class DispatchParentTapNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public function backoff(): array
    {
        return [30, 120, 300];
    }

    public function __construct(
        protected string $tenantId,
        protected string $tapEventId,
    ) {}

    public function handle(FcmClient $fcm): void
    {
        $tenant = Tenant::find($this->tenantId);
        if ($tenant?->status !== TenantStatus::Active) {
            return;
        }

        TenantDatabase::use($tenant);
        app(TenantContext::class)->set($tenant->id);

        $event = TapEvent::with('station')->find($this->tapEventId);
        if ($event === null || $event->person_id === null) {
            return;
        }

        $links = ParentStudentLink::query()
            ->where('person_id', $event->person_id)
            ->whereHas('parentAccount', fn ($query) => $query->where('is_active', true))
            ->with('parentAccount.deviceTokens')
            ->get();

        if ($links->isEmpty()) {
            return;
        }

        // Broadcast at most once per job run, and only if a message was
        // actually queued below — a wake-up nudge with nothing to claim
        // would just cost every idle device a wasted /claim round-trip.
        $queuedSms = false;

        $preferenceKey = $event->event_type === TapEventType::In ? 'notify_in' : 'notify_out';
        $verb = $event->event_type === TapEventType::In ? 'tapped in' : 'tapped out';
        $studentName = Person::find($event->person_id)?->display_name ?? 'Your child';
        $localOccurredAt = $event->occurred_at->clone()->setTimezone($tenant->timezone);
        $localTime = $localOccurredAt->format('g:i A');

        $title = "{$studentName} {$verb}";
        $body = "at {$localTime}";
        $data = [
            'type' => 'tap_event',
            'person_id' => $event->person_id,
            'event_type' => $event->event_type->value,
            'occurred_at' => $event->occurred_at->toIso8601String(),
        ];

        foreach ($links as $link) {
            $parent = $link->parentAccount;

            // The live dashboard update is not a "notification" the
            // notify_in/notify_out toggles govern — those only gate the
            // push. A parent who muted OUT alerts still sees an OUT tap
            // show up live if they have the app open.
            broadcast(new TapRecorded($parent->id, $event, $studentName, $event->station?->name));

            $preferences = $parent->notification_preferences ?? ['notify_in' => true, 'notify_out' => true];
            if (! ($preferences[$preferenceKey] ?? true)) {
                continue;
            }

            // SMS is an independent opt-in layered on top of the same
            // notify_in/notify_out direction gate the push channel already
            // checked above — it never bypasses a muted direction, but a
            // parent must separately turn it on (costs real money per
            // message, unlike push). See IP-007.
            if (($preferences['notify_sms'] ?? false) && filled($parent->phone_number)) {
                SmsOutboxMessage::create([
                    'tenant_id' => $tenant->id,
                    'person_id' => $event->person_id,
                    'parent_account_id' => $parent->id,
                    'station_id' => $event->station_id,
                    'tap_event_id' => $event->id,
                    'phone_number' => $parent->phone_number,
                    'message' => $this->formatSmsMessage($tenant, $event, $studentName, $verb, $localOccurredAt),
                    'status' => 'pending',
                    'expires_at' => Date::now()->addMinutes(30),
                ]);
                $queuedSms = true;
            }

            foreach ($parent->deviceTokens as $deviceToken) {
                $result = $fcm->send($deviceToken->fcm_token, $title, $body, $data);

                if (! ($result['ok'] ?? false)) {
                    Log::warning('FCM push rejected.', ['token' => $deviceToken->fcm_token, 'result' => $result]);
                }

                if (($result['unregistered'] ?? false) === true) {
                    $deviceToken->delete();
                }
            }
        }

        if ($queuedSms) {
            broadcast(new SmsGatewayWakeUp);
        }
    }

    /**
     * A formal "letterhead" layout (school name, then labeled fields) rather
     * than a single terse sentence — chosen over shorter alternatives
     * despite costing roughly double per message (this exceeds a single
     * 160-char GSM-7 SMS segment, unlike a one-line alternative would),
     * because it reads as an official school notice rather than a raw log
     * line. Deliberately avoids characters outside the GSM-7 basic alphabet
     * (e.g. "·", em dashes, curly quotes) — anything outside it forces the
     * *entire* message into UCS-2 encoding, dropping the per-segment limit
     * from 160 to 70 characters and silently multiplying the segment count.
     */
    private function formatSmsMessage(Tenant $tenant, TapEvent $event, string $studentName, string $verb, $localOccurredAt): string
    {
        $lines = [
            strtoupper($tenant->name),
            "Attendance Alert: {$studentName}",
            'Status: '.strtoupper($verb),
            'Time: '.$localOccurredAt->format('g:i A').' ('.$this->gmtOffsetLabel($localOccurredAt).')',
            'Date: '.$localOccurredAt->format('M j, Y'),
        ];

        if ($event->station !== null) {
            $lines[] = "Station: {$event->station->name}";
        }

        return implode("\n", $lines);
    }

    /** e.g. "GMT+8" for Asia/Manila, "GMT+5:30" for a half-hour offset. */
    private function gmtOffsetLabel($localOccurredAt): string
    {
        $totalMinutes = $localOccurredAt->getOffset() / 60;
        $sign = $totalMinutes >= 0 ? '+' : '-';
        $hours = intdiv(abs($totalMinutes), 60);
        $minutes = abs($totalMinutes) % 60;

        return $minutes === 0 ? "GMT{$sign}{$hours}" : sprintf('GMT%s%d:%02d', $sign, $hours, $minutes);
    }
}
