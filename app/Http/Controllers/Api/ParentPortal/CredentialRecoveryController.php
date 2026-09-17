<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Enums\IntegrationProfileStatus;
use App\Enums\SmsOutboxStatus;
use App\Events\SmsGatewayWakeUp;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\IntegrationProfile;
use App\Models\SmsOutboxMessage;
use App\Services\Integrations\EssentielApiConnector;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;

class CredentialRecoveryController extends Controller
{
    public function store(Request $request, string $person): JsonResponse
    {
        $parent = $request->attributes->get('parent_account');
        $student = $parent->authorizedStudents()->whereKey($person)->firstOrFail();

        abort_unless($student->source_system === 'essentiel_api' && filled($student->source_record_id), 422, 'Credentials are unavailable for this student.');

        $profile = IntegrationProfile::allTenants()
            ->where('tenant_id', $parent->tenant_id)
            ->where('driver', 'essentiel_api')
            ->where('status', IntegrationProfileStatus::Active)
            ->first();

        abort_unless($profile !== null, 422, 'Credential recovery is not available for this school.');

        $idempotencyKey = $request->header('Idempotency-Key') ?: (string) Str::uuid();
        $response = EssentielApiConnector::forProfile($profile)
            ->credentialSmsPayload($student->source_record_id, $idempotencyKey);

        if (! $response->successful()) {
            $status = in_array($response->status(), [401, 403], true)
                ? 502
                : $response->status();

            return response()->json([
                'message' => $status === 502
                    ? 'Credential recovery is temporarily unavailable. Please contact your school.'
                    : ($response->json('message') ?? 'Could not prepare credentials. Please try again later.'),
                'error' => $status === 502 ? 'credential_service_unavailable' : $response->json('error'),
            ], $status);
        }

        if ($response->json('idempotent_replay') === true) {
            return response()->json([
                'status' => 'already_requested',
                'delivery' => ['masked_phone' => $this->maskPhone((string) $response->json('recipient'))],
            ]);
        }

        $recipient = (string) $response->json('recipient');
        $message = (string) $response->json('message');
        abort_unless($recipient !== '' && $message !== '' && strlen($message) <= 320, 502, 'Credential delivery payload was invalid.');

        SmsOutboxMessage::create([
            'tenant_id' => $parent->tenant_id,
            'person_id' => $student->id,
            'parent_account_id' => $parent->id,
            'phone_number' => $recipient,
            'message' => $message,
            'status' => SmsOutboxStatus::Pending,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        broadcast(new SmsGatewayWakeUp);
        AuditLog::record('parent.credentials_queued', $parent, $parent->tenant_id, 'person', $student->id);

        return response()->json([
            'status' => 'queued',
            'delivery' => ['masked_phone' => $this->maskPhone($recipient)],
        ], 202);
    }

    private function maskPhone(string $phone): string
    {
        return strlen($phone) < 5 ? '' : substr($phone, 0, 3).'••••'.substr($phone, -4);
    }
}
