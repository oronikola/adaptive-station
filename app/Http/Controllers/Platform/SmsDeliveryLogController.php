<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\SmsGatewayDevice;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only, cross-school view of every SMS tap alert attempted — which
 * phone numbers were sent/delivered vs. still pending or failed, per school,
 * and (via the device filter) per fleet phone — "all the phones and what
 * they've sent/failed" in one place. sms_outbox is a central table (see its
 * migration), so this is one query across every tenant, not a
 * per-tenant-database loop like Platform\StationController.
 */
class SmsDeliveryLogController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', SmsOutboxMessage::class);

        $filters = $request->only(['tenant_id', 'device_id', 'status', 'phone_number']);

        $messages = SmsOutboxMessage::query()
            ->with(['tenant:id,name', 'device:id,label'])
            ->when($filters['tenant_id'] ?? null, fn ($query, $tenantId) => $query->where('tenant_id', $tenantId))
            // A device is only ever attached to a message it actually
            // claimed/sent (see SmsOutboxMessage::markFailed()'s docblock on
            // why a failed row loses this) — filtering by device_id here
            // necessarily only surfaces its sent/delivered messages, not
            // ones it once attempted and failed.
            ->when($filters['device_id'] ?? null, fn ($query, $deviceId) => $query->where('claimed_by_device_id', $deviceId))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['phone_number'] ?? null, fn ($query, $phone) => $query->where('phone_number', 'like', "%{$phone}%"))
            ->latest('created_at')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Platform/sms-log/sms-log-list-screen', [
            'messages' => $messages,
            'tenants' => Tenant::query()->orderBy('name')->get(['id', 'name']),
            'devices' => SmsGatewayDevice::query()->orderBy('label')->get(['id', 'label']),
            'filters' => $filters,
            'stats' => $this->stats(),
            'failureSummary' => $this->failureSummary(),
        ]);
    }

    /**
     * Always scoped to every message across every school, independent of the
     * current filters — a permanent overview, not a filtered count. Claimed
     * folds into "pending" (still in flight) and expired folds into "failed"
     * (never reached the phone) so the stat grid stays at a glance-able 5
     * cards instead of one per raw enum value. Mirrors Portal's own
     * SmsDeliveryLogController::stats(), just without the tenant_id scope.
     *
     * @return array{total: int, pending: int, sent: int, delivered: int, failed: int}
     */
    private function stats(): array
    {
        $counts = SmsOutboxMessage::query()
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

    /** @return array<int, array{category: string, count: int}> */
    private function failureSummary(): array
    {
        return SmsOutboxMessage::query()
            ->where('status', SmsOutboxStatus::Failed)
            ->whereNotNull('failure_category')
            ->selectRaw('failure_category, count(*) as aggregate')
            ->groupBy('failure_category')
            ->orderByDesc('aggregate')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['category' => $row->failure_category, 'count' => (int) $row->aggregate])
            ->all();
    }
}
