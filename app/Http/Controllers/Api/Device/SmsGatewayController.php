<?php

namespace App\Http\Controllers\Api\Device;

use App\Enums\SmsOutboxStatus;
use App\Http\Controllers\Api\Device\Concerns\ResolvesAuthenticatedSmsGatewayDevice;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SmsGatewayDeviceSimStat;
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
        ]);

        $device = $this->smsGatewayDevice($request);
        $device->resetDailyStatsIfNeeded()->save();

        $messages = SmsOutboxMessage::claimBatch($device, $data['batch_size'] ?? 20);

        return response()->json([
            'messages' => $messages->map(fn (SmsOutboxMessage $message) => [
                'id' => $message->id,
                'phone_number' => $message->phone_number,
                'message' => $message->message,
            ])->values(),
        ]);
    }

    public function reportStatus(Request $request, string $message): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['sent', 'failed', 'delivered'])],
            'error' => ['nullable', 'string', 'max:255'],
            // Which physical SIM (0 or 1) the device actually sent from —
            // optional so an app build older than this feature keeps
            // working unchanged, just without per-SIM cap tracking.
            'sim_slot' => ['nullable', 'integer', 'min:0', 'max:1'],
        ]);

        $device = $this->smsGatewayDevice($request);
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
            $row->markSent($simSlot);
            $device->increment('sent_today');
            if ($simSlot !== null) {
                SmsGatewayDeviceSimStat::incrementFor($device->id, $simSlot, 'sent_today');
            }
        } else {
            $row->markFailed($data['error'] ?? null, $simSlot);
            $device->increment('failed_today');
            if ($simSlot !== null) {
                SmsGatewayDeviceSimStat::incrementFor($device->id, $simSlot, 'failed_today');
            }
        }

        return response()->json(['status' => 'ok']);
    }
}
