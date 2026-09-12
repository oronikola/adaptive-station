<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\SmsOutboxMessage;
use App\Support\TenantContext;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Additive screen exclusive to adaptivestation_admin, scoped to whichever
 * school it currently has selected (see the oversight school-picker) — not
 * a general tenant_admin/tenant_operator feature, so it's authorized inline
 * here rather than through a shared policy. sms_outbox lives on the central
 * `mysql` connection (see its migration), so this filters by the tenant
 * TenantContext already resolved, rather than the 'tenant' per-school
 * connection every other Portal controller queries.
 */
class SmsDeliveryLogController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->isAdaptivestationAdmin(), 403);

        $tenantId = app(TenantContext::class)->get();

        $filters = $request->only(['status', 'phone_number']);

        $messages = SmsOutboxMessage::query()
            ->where('tenant_id', $tenantId)
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['phone_number'] ?? null, fn ($query, $phone) => $query->where('phone_number', 'like', "%{$phone}%"))
            ->latest('created_at')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Admin/sms-log/sms-log-list-screen', [
            'messages' => $messages,
            'filters' => $filters,
            'stats' => $this->stats($tenantId),
        ]);
    }

    /**
     * Always scoped to every message for this school, independent of the
     * current status/phone filter — a permanent overview, not a filtered
     * count. Claimed folds into "pending" (still in flight) and expired
     * folds into "failed" (never reached the phone) so the stat grid stays
     * at a glance-able 5 cards instead of one per raw enum value.
     *
     * @return array{total: int, pending: int, sent: int, delivered: int, failed: int}
     */
    private function stats(?string $tenantId): array
    {
        $counts = SmsOutboxMessage::query()
            ->where('tenant_id', $tenantId)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->status->value => (int) $row->aggregate]);

        return [
            'total' => $counts->sum(),
            'pending' => ($counts['pending'] ?? 0) + ($counts['claimed'] ?? 0),
            'sent' => $counts['sent'] ?? 0,
            'delivered' => $counts['delivered'] ?? 0,
            'failed' => ($counts['failed'] ?? 0) + ($counts['expired'] ?? 0),
        ];
    }
}
