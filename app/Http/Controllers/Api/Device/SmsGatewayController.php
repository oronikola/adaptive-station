<?php

namespace App\Http\Controllers\Api\Device;

use App\Enums\SmsOutboxStatus;
use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedSmsGatewayDevice;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\SmsGatewayDeviceSimStatus;
use App\Models\SmsGatewayDeviceToken;
use App\Models\SmsOutboxMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SmsGatewayController extends Controller
{
    use ResolvesAuthenticatedSmsGatewayDevice;

    public function logout(Request $request): JsonResponse
    {
        $device = $this->smsGatewayDevice($request);
        $credential = $request->attributes->get('sms_gateway_credential');
        SmsGatewayDeviceToken::revoke($credential);

        AuditLog::record('sms_gateway_device.logout', null, null, 'sms_gateway_device', $device->id);

        return response()->json(['message' => 'Logged out.']);
    }

    public function claim(Request $request): JsonResponse
    {
        $data = $request->validate([
            'batch_size' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'sim_slot' => ['nullable', 'integer', 'min:0', 'max:1'],
        ]);

        $device = $this->smsGatewayDevice($request);
        $device->resetDailyStatsIfNeeded()->save();

        if (! $device->canClaimSmsFor($data['sim_slot'] ?? null)) {
            return response()->json(['messages' => []]);
        }

        $messages = SmsOutboxMessage::claimBatch($device, $data['batch_size'] ?? 20);

        return response()->json([
            'messages' => $messages->map(fn (SmsOutboxMessage $message) => [
                'id' => $message->id,
                'phone_number' => $message->phone_number,
                'message' => $message->message,
            ])->values(),
        ]);
    }

    public function simStatuses(Request $request): JsonResponse
    {
        $device = $this->smsGatewayDevice($request);

        return response()->json([
            'sim_statuses' => $device->simStatuses()
                ->orderBy('sim_slot')
                ->get()
                ->map(fn (SmsGatewayDeviceSimStatus $status) => $this->simStatusPayload($status))
                ->values(),
        ]);
    }

    public function reportSimStatus(Request $request, int $simSlot): JsonResponse
    {
        abort_unless(in_array($simSlot, [0, 1], true), 404);

        $data = $request->validate([
            'carrier' => ['required', 'in:smart'],
            'status' => ['required', Rule::in(['has_load', 'no_load', 'unknown', 'paused'])],
            'balance_centavos' => ['nullable', 'integer', 'min:0'],
            'source' => ['required', Rule::in(['manual', 'ussd'])],
            'last_error' => ['nullable', 'string', 'max:255'],
        ]);

        $status = SmsGatewayDeviceSimStatus::query()->updateOrCreate(
            ['device_id' => $this->smsGatewayDevice($request)->id, 'sim_slot' => $simSlot],
            [...$data, 'checked_at' => now()],
        );

        return response()->json(['sim_status' => $this->simStatusPayload($status)]);
    }

    /** @return array{id: string, sim_slot: int, carrier: string, status: string, balance_centavos: int|null, source: string, checked_at: string|null, last_error: string|null} */
    private function simStatusPayload(SmsGatewayDeviceSimStatus $status): array
    {
        return [
            'id' => $status->id,
            'sim_slot' => $status->sim_slot,
            'carrier' => $status->carrier,
            'status' => $status->status,
            'balance_centavos' => $status->balance_centavos,
            'source' => $status->source,
            'checked_at' => $status->checked_at?->toIso8601String(),
            'last_error' => $status->last_error,
        ];
    }

    public function reportStatus(Request $request, string $message): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['sent', 'failed', 'delivered'])],
            'error' => ['nullable', 'string', 'max:255'],
            'failure_category' => ['nullable', 'string', 'max:50'],
            'android_result_code' => ['nullable', 'integer'],
            'carrier_error_code' => ['nullable', 'integer'],
            'gateway_app_version' => ['nullable', 'string', 'max:50'],
            // Which physical SIM (0 or 1) the device actually sent from —
            // optional so an app build older than this feature keeps
            // working unchanged, just without per-SIM cap tracking.
            'sim_slot' => ['nullable', 'integer', 'min:0', 'max:1'],
        ]);

        $device = $this->smsGatewayDevice($request);
        $device->resetDailyStatsIfNeeded()->save();
        $simSlot = $data['sim_slot'] ?? null;

        // Scoped to this device's own claim — a device can never report
        // status on a row it didn't claim itself. markSent() never clears
        // claimed_by_device_id, so a later, out-of-band delivery report
        // (the carrier's report can arrive seconds to minutes after the
        // original send/claim cycle) still resolves through this same scope.
        $row = SmsOutboxMessage::query()
            ->where('claimed_by_device_id', $device->id)
            ->findOrFail($message);

        if ($data['status'] === 'delivered') {
            // Only meaningful after this device's own send actually
            // succeeded — a delivery report can't retroactively apply to a
            // message that was reported failed (which also clears
            // claimed_by_device_id, so it would already 404 above) or is
            // still only claimed.
            abort_unless($row->status === SmsOutboxStatus::Sent, 409, 'Message has not been reported sent yet.');

            $row->markDelivered();
            $device->increment('delivered_today');
            if ($simSlot !== null) {
                SmsGatewayDeviceSimStat::incrementFor($device->id, $simSlot, 'delivered_today');
            }
        } elseif ($data['status'] === 'sent') {
            // markSent() deliberately leaves claimed_by_device_id set (see
            // its docblock, for a later delivery report), so unlike
            // 'failed' below, a retried 'sent' report — the device retrying
            // after a network hiccup even though its first call already
            // succeeded server-side — still passes the ownership scope
            // above and would reach here again. Only count it once.
            if ($row->status === SmsOutboxStatus::Claimed) {
                $row->markSent($simSlot);
                $device->increment('sent_today');
                if ($simSlot !== null) {
                    SmsGatewayDeviceSimStat::incrementFor($device->id, $simSlot, 'sent_today');
                }
            }
        } else {
            $failureCategory = $data['failure_category'] ?? $this->failureCategoryFor($data['error'] ?? null);

            $row->markFailed(
                error: $data['error'] ?? null,
                simSlot: $simSlot,
                failureCategory: $failureCategory,
                androidResultCode: $data['android_result_code'] ?? null,
                carrierErrorCode: $data['carrier_error_code'] ?? null,
                gatewayAppVersion: $data['gateway_app_version'] ?? null,
            );
            $device->increment('failed_today');
            if ($simSlot !== null) {
                SmsGatewayDeviceSimStat::incrementFor($device->id, $simSlot, 'failed_today');
            }
        }

        return response()->json(['status' => 'ok']);
    }

    private function failureCategoryFor(?string $error): ?string
    {
        return match ($error) {
            'no mobile service' => 'No mobile service',
            'SIM radio is turned off' => 'SIM radio off',
            'no default SIM selected' => 'No default SIM',
            'SMS sending limit reached' => 'SMS sending limit',
            'SIM fixed-dialing restriction' => 'SIM dialing restriction',
            'carrier rejected SMS (no carrier detail)' => 'Carrier rejected',
            default => str_starts_with($error ?? '', 'carrier rejected SMS') ? 'Carrier rejected' : null,
        };
    }
}
