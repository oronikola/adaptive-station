<?php

namespace App\Http\Controllers\Platform;

use App\Enums\SmsOutboxStatus;
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
            'deviceStats' => $this->deviceStats(),
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

    /**
     * "sent" only ever confirms the phone's modem handed the message to the
     * carrier — not that the carrier actually delivered it (see
     * MainActivity.kt's docblock on the native Android side). A SIM the
     * carrier has started silently spam-throttling still reports "sent" on
     * every attempt, so a per-device sent-vs-delivered gap is the only
     * visible symptom from here — one device's messages piling up in "sent"
     * while another's mostly reach "delivered" is the tell that a specific
     * SIM's messages are being accepted locally but dropped upstream.
     *
     * Not every carrier sends a delivery report at all, so a nonzero gap is
     * not by itself proof of a problem — read this as a relative signal
     * across devices, not an absolute one. Only "sent"/"delivered" rows
     * count (not "failed": markFailed() clears claimed_by_device_id, so a
     * failed attempt is no longer attributable to the device that tried it —
     * see SmsOutboxMessage::markFailed()'s docblock). Devices that have never
     * sent anything are omitted rather than shown at a meaningless 0%.
     *
     * @return array<int, array{id: string, label: string, sent: int, delivered: int, attempted: int, stuck_rate: float}>
     */
    private function deviceStats(): array
    {
        $counts = SmsOutboxMessage::query()
            ->whereNotNull('claimed_by_device_id')
            ->whereIn('status', [SmsOutboxStatus::Sent, SmsOutboxStatus::Delivered])
            ->selectRaw('claimed_by_device_id, status, count(*) as aggregate')
            ->groupBy('claimed_by_device_id', 'status')
            ->get()
            ->groupBy('claimed_by_device_id');

        return SmsGatewayDevice::query()
            ->orderBy('label')
            ->get(['id', 'label'])
            ->map(function (SmsGatewayDevice $device) use ($counts) {
                $rows = $counts->get($device->id, collect());
                $sent = (int) ($rows->firstWhere('status', SmsOutboxStatus::Sent)->aggregate ?? 0);
                $delivered = (int) ($rows->firstWhere('status', SmsOutboxStatus::Delivered)->aggregate ?? 0);
                $attempted = $sent + $delivered;

                return [
                    'id' => $device->id,
                    'label' => $device->label,
                    'sent' => $sent,
                    'delivered' => $delivered,
                    'attempted' => $attempted,
                    'stuck_rate' => $attempted > 0 ? round(($sent / $attempted) * 100, 1) : 0.0,
                ];
            })
            ->filter(fn (array $row) => $row['attempted'] > 0)
            ->sortByDesc('stuck_rate')
            ->values()
            ->all();
    }
}
