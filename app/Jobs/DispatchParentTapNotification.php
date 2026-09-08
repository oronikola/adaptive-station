<?php

namespace App\Jobs;

use App\Enums\TapEventType;
use App\Enums\TenantStatus;
use App\Events\TapRecorded;
use App\Models\ParentStudentLink;
use App\Models\Person;
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

        $preferenceKey = $event->event_type === TapEventType::In ? 'notify_in' : 'notify_out';
        $verb = $event->event_type === TapEventType::In ? 'tapped in' : 'tapped out';
        $studentName = Person::find($event->person_id)?->display_name ?? 'Your child';
        $localTime = $event->occurred_at->clone()->setTimezone($tenant->timezone)->format('g:i A');

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
    }
}
