<?php

namespace App\Services\Integrations;

use App\Enums\PersonType;
use App\Events\SmsGatewayWakeUp;
use App\Models\AuditLog;
use App\Models\IntegrationProfile;
use App\Models\ParentStudentLink;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\SmsOutboxMessage;
use App\Models\TapEvent;
use App\Models\Tenant;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;

/**
 * The actual "call essentiel, auto-provision, send SMS" logic for the
 * essentiel_api driver — extracted from PushTapEventToEssentielJob so the
 * exact same behavior can run either queued (the normal batch-upload path)
 * or synchronously in the same request (the kiosk's "unrecognized card,
 * ask now and wait" fallback — see TapEventResolveController). Both callers
 * must never run this twice for the same tap; see each caller's own
 * docblock for how it avoids that.
 */
class EssentielTapResolver
{
    public const SOURCE_SYSTEM = 'essentiel_api';

    /**
     * @return array{found: bool, reason?: ?string, person_id?: ?string, person?: ?array, tapstate?: ?string}
     */
    public function resolve(Tenant $tenant, IntegrationProfile $profile, TapEvent $event): array
    {
        $connector = EssentielApiConnector::forProfile($profile);
        $stationIdentifier = $event->station?->legacy_station_id ?? $event->station?->station_code ?? 'UNKNOWN';

        $response = $connector->record($event->card_uid, $stationIdentifier);

        if (($response['found'] ?? false) !== true) {
            Log::info('essentiel tap lookup: unknown card.', [
                'tenant_id' => $tenant->id,
                'tap_event_id' => $event->id,
                'reason' => $response['reason'] ?? null,
            ]);

            return ['found' => false, 'reason' => $response['reason'] ?? null];
        }

        $personId = $event->person_id ?? $this->resolveOrCreateLocalPerson($tenant->id, $event->card_uid, $response);

        // The tap is initially stored before Essentiel resolves a card that
        // is missing from the kiosk's local cache. Backfill the resolved
        // identity so portal attendance can recognize the very first tap,
        // just like subsequent taps that use the local RFID lookup.
        if ($event->person_id === null && $personId !== null) {
            $person = Person::allTenants()->find($personId);

            if ($person !== null) {
                $event->forceFill([
                    'person_id' => $person->id,
                    'person_type' => $person->person_type,
                ])->save();
            }
        }

        $smsRecipient = $response['sms_recipient'] ?? null;

        if (($response['status'] ?? null) === 'recorded' && filled($smsRecipient)) {
            SmsOutboxMessage::create([
                'tenant_id' => $tenant->id,
                'person_id' => $personId,
                'parent_account_id' => null,
                'station_id' => $event->station_id,
                'tap_event_id' => $event->id,
                'phone_number' => $smsRecipient,
                'message' => $this->formatSmsMessage($tenant, $event, $response),
                'status' => 'pending',
                'expires_at' => Date::now()->addMinutes(30),
            ]);

            broadcast(new SmsGatewayWakeUp);
        }

        if ($personId !== null && filled($smsRecipient)) {
            $this->syncLocalGuardianPhone($tenant->id, $personId, $smsRecipient);
        }

        return [
            'found' => true,
            'person_id' => $personId,
            'person' => $response['person'] ?? null,
            'tapstate' => $response['tap']['tapstate'] ?? null,
        ];
    }

    /**
     * Auto-provisions a local Person + RfidCard the first time a card
     * resolves through essentiel with no local match — every tap after this
     * one resolves through the ordinary fast local RfidCard lookup instead
     * (see TapEvent::acceptBatch()). Guarded twice against duplicate
     * creation: by essentiel's own person id (source_record_id), in case
     * this same not-yet-local student taps again before this job's first
     * run commits, and by card_uid, in case the RfidCard alone was already
     * assigned (e.g. a support operation) without the Person existing yet.
     */
    protected function resolveOrCreateLocalPerson(string $tenantId, string $cardUid, array $response): ?string
    {
        $personData = $response['person'] ?? null;
        $sourceRecordId = $personData !== null ? (string) ($personData['id'] ?? '') : '';

        if ($personData === null || $sourceRecordId === '') {
            return null;
        }

        $person = Person::allTenants()
            ->where('tenant_id', $tenantId)
            ->where('source_system', self::SOURCE_SYSTEM)
            ->where('source_record_id', $sourceRecordId)
            ->first();

        if ($person === null) {
            $person = Person::registerForTenant($tenantId, [
                'person_type' => ($personData['type'] ?? 'student') === 'staff' ? PersonType::Staff : PersonType::Student,
                'first_name' => $personData['name']['first'] ?? '',
                'middle_name' => $personData['name']['middle'] ?? null,
                'last_name' => $personData['name']['last'] ?? '',
                'grade_level' => $personData['level']['name'] ?? null,
                'source_system' => self::SOURCE_SYSTEM,
                'source_record_id' => $sourceRecordId,
            ]);
        }

        $cardAlreadyAssigned = RfidCard::allTenants()
            ->where('tenant_id', $tenantId)
            ->where('card_uid', RfidCard::normalizeCardUid($cardUid))
            ->exists();

        if (! $cardAlreadyAssigned) {
            RfidCard::assign($tenantId, $person->id, $cardUid);
        }

        return $person->id;
    }

    /**
     * Best-effort local refresh: only touches a student's guardian phone
     * number when exactly one active ParentAccount is linked, so we never
     * risk guessing wrong and overwriting a specific parent's own distinct
     * record when a student has multiple linked guardians.
     */
    protected function syncLocalGuardianPhone(string $tenantId, string $personId, string $smsRecipient): void
    {
        $links = ParentStudentLink::where('person_id', $personId)
            ->whereHas('parentAccount', fn ($query) => $query->where('is_active', true))
            ->with('parentAccount')
            ->get();

        if ($links->count() !== 1) {
            return;
        }

        $parent = $links->first()->parentAccount;

        if ($parent->phone_number === $smsRecipient) {
            return;
        }

        $previous = $parent->phone_number;
        $parent->forceFill(['phone_number' => $smsRecipient])->save();

        AuditLog::record('parent_account.phone_number_synced', null, $tenantId, 'parent_account', $parent->id, [
            'previous_phone_number' => $previous,
            'new_phone_number' => $smsRecipient,
            'source' => self::SOURCE_SYSTEM,
        ]);
    }

    /** Same "letterhead" shape as DispatchParentTapNotification::formatSmsMessage(), sourced from essentiel's response instead of local data. */
    private function formatSmsMessage(Tenant $tenant, TapEvent $event, array $response): string
    {
        $studentName = $response['person']['name']['full'] ?? 'Your child';
        $tapstate = $response['tap']['tapstate'] ?? null;
        $verb = $tapstate === '0' ? 'tapped out' : 'tapped in';
        $localOccurredAt = $event->occurred_at->clone()->setTimezone($tenant->timezone);

        $lines = [
            strtoupper($tenant->name),
            "Attendance Alert: {$studentName}",
            'Status: '.strtoupper($verb),
            'Time: '.$localOccurredAt->format('g:i A'),
            'Date: '.$localOccurredAt->format('M j, Y'),
        ];

        if ($event->station !== null) {
            $lines[] = "Station: {$event->station->name}";
        }

        return implode("\n", $lines);
    }
}
