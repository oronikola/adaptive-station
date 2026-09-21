<?php

namespace App\Services\Integrations;

use App\Enums\PersonType;
use App\Events\SmsGatewayWakeUp;
use App\Models\AuditLog;
use App\Models\IntegrationProfile;
use App\Models\ParentAccount;
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
     * @return array{found: bool, reason?: ?string, person_id?: ?string, person?: ?array, tapstate?: string|int|null}
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

        Log::info('essentiel tap lookup: photo fields in response.', [
            'tenant_id' => $tenant->id,
            'tap_event_id' => $event->id,
            'card_uid' => $event->card_uid,
            'person_id' => $personId,
            'photo_url' => $response['person']['photo_url'] ?? null,
            'photo_path' => $response['person']['photo_path'] ?? null,
            'person_keys' => $response['person'] !== null ? array_keys($response['person']) : null,
        ]);

        // Keeps the local Person's photo in step with essentiel's own —
        // covers both a card resolved for the very first time above and one
        // that already had a local Person row from before essentiel started
        // returning photos (or before this one changed), so the kiosk's tap
        // display and its offline cache both get a photo without waiting on
        // a portal-side edit.
        if ($personId !== null) {
            $this->syncPersonPhoto($personId, $response['person'] ?? null);
        }

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
            // Guards against a carrier silently dropping (not failing — just
            // never delivering) a burst of texts to the same recipient in a
            // short window — see SmsOutboxMessage::recentlySentTo()'s
            // docblock. Same guard as DispatchParentTapNotification's local
            // path, just keyed by the raw recipient number essentiel
            // returned since this path has no ParentAccount to key off.
            if (SmsOutboxMessage::recentlySentTo($smsRecipient)) {
                AuditLog::record('tap_notification.sms_suppressed_recipient_interval', null, $tenant->id, 'person', $personId, [
                    'masked_phone' => ParentAccount::maskedPhone($smsRecipient),
                    'tap_event_id' => $event->id,
                ]);
            } else {
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
        }

        if ($personId !== null && filled($response['guardians'] ?? null)) {
            $this->syncGuardians($tenant, $event, $personId, $response['guardians'], $response['person']['name']['full'] ?? null);
        }

        return [
            'found' => true,
            'person_id' => $personId,
            'person' => $response['person'] ?? null,
            'tapstate' => $response['tap']['tapstate'] ?? null,
        ];
    }

    protected function syncPersonPhoto(string $personId, ?array $personData): void
    {
        $photoUrl = $personData['photo_url'] ?? $personData['photo_path'] ?? null;

        if ($photoUrl === null) {
            return;
        }

        $person = Person::allTenants()->find($personId);

        if ($person === null || $person->photo_url === $photoUrl) {
            return;
        }

        Person::updateDetails($person, ['photo_url' => $photoUrl]);
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
     * Auto-provisions a ParentAccount (and links it to the resolved
     * student) for every guardian essentiel's tap response lists — that
     * guardian data was previously read only for the sms_recipient field
     * and otherwise discarded. Runs once per unrecognized-card resolve, not
     * on every routine tap: an already-cached card resolves through the
     * kiosk's local lookup instead and never reaches this method again
     * (see TapEvent::acceptBatch()).
     *
     * Matched by phone number rather than email, since essentiel never
     * gives a guardian email — findOrProvisionByPhone() finds an existing
     * account with that phone, or creates one. An unrecognized phone always
     * becomes its own separate ParentAccount rather than overwriting an
     * existing guardian's record, since there is no reliable way to tell
     * "the same guardian's number changed" apart from "a different
     * guardian entirely" from this payload alone.
     */
    protected function syncGuardians(Tenant $tenant, TapEvent $event, string $personId, array $guardians, ?string $studentName): void
    {
        foreach ($guardians as $guardian) {
            $phone = $this->normalizeGuardianPhone($guardian);

            if ($phone === null) {
                continue;
            }

            $name = trim((string) ($guardian['name'] ?? '')) ?: 'Guardian';

            ['account' => $account, 'created' => $created] = ParentAccount::findOrProvisionByPhone($tenant->id, $phone, $name);

            $account->studentLinks()->firstOrCreate(['person_id' => $personId]);

            if ($created) {
                $this->sendGuardianCredentialsSms($tenant, $event, $personId, $account, $studentName ?? 'your child');
            }
        }
    }

    protected function normalizeGuardianPhone(array $guardian): ?string
    {
        $phone = $guardian['msisdn'] ?? $guardian['msisdn_local'] ?? null;
        $phone = is_string($phone) ? trim($phone) : null;

        return filled($phone) ? $phone : null;
    }

    /** Delivers a brand-new guardian's generated login_id/password the same way the attendance alert above is sent — via the SMS outbox, picked up by the fleet-phone poller. */
    protected function sendGuardianCredentialsSms(Tenant $tenant, TapEvent $event, string $personId, ParentAccount $account, string $studentName): void
    {
        SmsOutboxMessage::create([
            'tenant_id' => $tenant->id,
            'person_id' => $personId,
            'parent_account_id' => $account->id,
            'station_id' => $event->station_id,
            'tap_event_id' => $event->id,
            'phone_number' => $account->phone_number,
            'message' => $this->formatCredentialsSmsMessage($tenant, $account, $studentName),
            'status' => 'pending',
            'expires_at' => Date::now()->addMinutes(30),
        ]);

        broadcast(new SmsGatewayWakeUp);
    }

    private function formatCredentialsSmsMessage(Tenant $tenant, ParentAccount $account, string $studentName): string
    {
        return implode("\n", [
            strtoupper($tenant->name),
            "A parent portal account was created for you as {$studentName}'s guardian.",
            "Login ID: {$account->login_id}",
            "Password: {$account->password_plaintext}",
        ]);
    }

    /** Same "letterhead" shape as DispatchParentTapNotification::formatSmsMessage(), sourced from essentiel's response instead of local data. */
    private function formatSmsMessage(Tenant $tenant, TapEvent $event, array $response): string
    {
        $studentName = $response['person']['name']['full'] ?? 'Your child';
        // Essentiel deployments encode this as either string "0" or numeric
        // 0. Normalize it before determining the guardian-facing status.
        $tapstate = (string) ($response['tap']['tapstate'] ?? '');
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
