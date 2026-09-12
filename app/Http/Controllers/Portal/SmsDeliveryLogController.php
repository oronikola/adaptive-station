<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\SmsOutboxMessage;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Contracts\View\View;
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

        $filters = $request->only(['status', 'phone_number', 'date_from', 'date_to']);

        // A phone-number search is inherently narrow (one person's own
        // messages, not the whole school) and is the case the print button
        // exists for — printing must show that number's complete history,
        // not just page 1 of the default 50. Browsing everything (no phone
        // filter) keeps the normal page size.
        $perPage = filled($filters['phone_number'] ?? null) ? 1000 : 50;

        $messages = SmsOutboxMessage::query()
            ->where('tenant_id', $tenantId)
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['phone_number'] ?? null, fn ($query, $phone) => $query->where('phone_number', 'like', "%{$phone}%"))
            ->when($filters['date_from'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
            ->latest('created_at')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Admin/sms-log/sms-log-list-screen', [
            'messages' => $messages,
            'filters' => $filters,
            'stats' => $this->stats($tenantId),
        ]);
    }

    /**
     * A standalone, non-Inertia page (not the SPA shell) — opened in a new
     * tab so the admin gets a preview to check before printing/saving as
     * PDF, rather than the browser's print dialog firing immediately.
     * Requires phone_number: this is "that specific number's" complete
     * history, not a general export of the school's traffic.
     */
    public function print(Request $request): View
    {
        abort_unless($request->user()->isAdaptivestationAdmin(), 403);

        $data = $request->validate([
            'phone_number' => ['required', 'string', 'max:20'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $tenantId = app(TenantContext::class)->get();

        $messages = SmsOutboxMessage::query()
            ->where('tenant_id', $tenantId)
            ->where('phone_number', 'like', "%{$data['phone_number']}%")
            ->when($data['date_from'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
            ->when($data['date_to'] ?? null, fn ($query, $date) => $query->whereDate('created_at', '<=', $date))
            ->latest('created_at')
            ->get()
            ->map(function (SmsOutboxMessage $message) {
                $message->parsed = $this->parseMessage($message->message);

                return $message;
            });

        return view('portal.sms-log-print', [
            'tenant' => Tenant::find($tenantId),
            // Grouped by day so the report reads as a timeline (one date
            // heading, then just times underneath) instead of repeating the
            // full date on every single row.
            'messagesByDate' => $messages->groupBy(fn (SmsOutboxMessage $message) => $message->created_at->toDateString()),
            'filters' => $data,
            'totalCount' => $messages->count(),
            'directionCounts' => $messages->countBy(fn (SmsOutboxMessage $message) => $message->parsed['direction'] ?? 'unknown'),
        ]);
    }

    /**
     * The SMS body is always this fixed "letterhead" template (see
     * DispatchParentTapNotification::formatSmsMessage) — parsed back into
     * its parts here so the print report can show Student/Direction/Station
     * as their own columns instead of one wall-of-text Message column per
     * row. Falls back to nulls (rendered as "—") rather than throwing if a
     * message ever doesn't match, e.g. hand-edited test data.
     *
     * @return array{student: ?string, direction: ?string, station: ?string}
     */
    private function parseMessage(string $message): array
    {
        $lines = explode("\n", $message);

        $find = function (string $prefix) use ($lines): ?string {
            foreach ($lines as $line) {
                if (str_starts_with($line, $prefix)) {
                    return trim(substr($line, strlen($prefix)));
                }
            }

            return null;
        };

        $status = $find('Status: ');
        $direction = match (true) {
            $status === null => null,
            str_contains($status, 'OUT') => 'OUT',
            str_contains($status, 'IN') => 'IN',
            default => null,
        };

        return [
            'student' => $find('Attendance Alert: '),
            'direction' => $direction,
            'station' => $find('Station: '),
        ];
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
