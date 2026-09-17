<?php

namespace App\Http\Controllers;

use App\Enums\SmsOutboxStatus;
use App\Enums\TenantStatus;
use App\Events\SmsGatewayWakeUp;
use App\Models\AuditLog;
use App\Models\ParentAccount;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public, unauthenticated self-service credential lookup: a parent who
 * doesn't know (or has forgotten) their login_id/password searches their
 * own name within their school, then has the login_id/password already on
 * their ParentAccount texted to the phone number on file — never shown on
 * screen, so a search result by itself can't hand a credential to someone
 * who isn't holding that phone. Every action here is rate-limited (see
 * routes/web.php) since, unlike the rest of the portal, nothing here
 * requires a logged-in session.
 */
class ParentCredentialLookupController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Parents/CredentialLookup');
    }

    public function schools(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:100']]);
        $search = trim((string) ($data['search'] ?? ''));

        $schools = Tenant::query()
            ->where('status', TenantStatus::Active)
            ->when($search !== '', fn ($query) => $query->where('name', 'like', '%'.$search.'%'))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name']);

        return response()->json(['schools' => $schools]);
    }

    public function search(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid', Rule::exists('tenants', 'id')],
            'name' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $parents = ParentAccount::allTenants()
            ->where('tenant_id', $data['tenant_id'])
            ->where('is_active', true)
            ->where('name', 'like', '%'.$data['name'].'%')
            ->orderBy('name')
            ->limit(10)
            ->get(['id', 'name', 'phone_number']);

        return response()->json([
            'parents' => $parents->map(fn (ParentAccount $parent) => [
                'id' => $parent->id,
                'name' => $parent->name,
                'masked_phone' => $this->maskPhone($parent->phone_number),
                'has_phone' => filled($parent->phone_number),
            ]),
        ]);
    }

    public function send(Request $request, string $parent): JsonResponse
    {
        $data = $request->validate(['tenant_id' => ['required', 'uuid', Rule::exists('tenants', 'id')]]);

        $account = ParentAccount::allTenants()
            ->where('tenant_id', $data['tenant_id'])
            ->where('is_active', true)
            ->findOrFail($parent);

        abort_if(blank($account->phone_number), 422, 'No phone number is on file for this account. Please contact your school.');

        // The table requires a person_id on every row (see its migration) —
        // every existing sender ties a message to the student it's about.
        // This self-service resend isn't about any one student, so it just
        // needs any of this guardian's own linked students to satisfy that;
        // an account with no links yet has nothing to attach it to.
        $personId = $account->studentLinks()->orderBy('person_id')->value('person_id');
        abort_if($personId === null, 422, 'No students are linked to this account yet. Please contact your school.');

        // A resend within the last 5 minutes is treated as the same request,
        // not a fresh one — stops repeated clicks (or a scripted retry) from
        // texting the same phone over and over.
        $recentlySent = SmsOutboxMessage::query()
            ->where('parent_account_id', $account->id)
            ->whereIn('status', [SmsOutboxStatus::Pending, SmsOutboxStatus::Claimed, SmsOutboxStatus::Sent])
            ->where('created_at', '>', Date::now()->subMinutes(5))
            ->exists();

        if ($recentlySent) {
            return response()->json(['status' => 'already_requested', 'masked_phone' => $this->maskPhone($account->phone_number)]);
        }

        SmsOutboxMessage::create([
            'tenant_id' => $account->tenant_id,
            'person_id' => $personId,
            'parent_account_id' => $account->id,
            'phone_number' => $account->phone_number,
            'message' => $this->formatCredentialsSmsMessage($account->load('tenant')),
            'status' => SmsOutboxStatus::Pending,
            'expires_at' => Date::now()->addMinutes(30),
        ]);
        broadcast(new SmsGatewayWakeUp);
        AuditLog::record('parent.credentials_self_service_queued', null, $account->tenant_id, 'parent_account', $account->id);

        return response()->json(['status' => 'queued', 'masked_phone' => $this->maskPhone($account->phone_number)]);
    }

    private function formatCredentialsSmsMessage(ParentAccount $account): string
    {
        $requestedAt = Date::now()->setTimezone($account->tenant->timezone);

        return implode("\n", [
            'Adaptive Station',
            $account->tenant->name,
            'Your parent portal login:',
            "Login ID: {$account->login_id}",
            "Password: {$account->password_plaintext}",
            'Requested '.$requestedAt->format('M j, Y g:i A'),
            "Didn't request this? Contact your school.",
        ]);
    }

    private function maskPhone(?string $phone): string
    {
        return $phone === null || strlen($phone) < 5 ? '' : substr($phone, 0, 3).'••••'.substr($phone, -4);
    }
}
