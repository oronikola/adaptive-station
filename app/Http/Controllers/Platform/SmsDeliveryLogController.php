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
        ]);
    }
}
