<?php

namespace App\Services;

use App\Enums\ImportBatchStatus;
use App\Enums\UserRole;
use App\Models\ImportBatch;
use App\Models\Station;
use App\Models\User;
use App\Notifications\WebAlertNotification;
use App\Support\WebNotificationPreferences;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Notification;

class WebNotificationService
{
    public function notifyStationOffline(Station $station): void
    {
        $this->notifyStationAudience(
            $station,
            'station_offline',
            'Station offline',
            "{$station->name} has not reported for more than ".config('device.station_offline_threshold_minutes').' minutes.',
            'warning',
        );
    }

    public function notifyStationRecovered(Station $station): void
    {
        $this->notifyStationAudience(
            $station,
            'station_recovered',
            'Station back online',
            "{$station->name} is reporting normally again.",
            'success',
        );
    }

    public function notifyGatewayOffline(string $deviceLabel): void
    {
        $this->notifyOperationsAudience(
            'gateway_offline',
            'SMS gateway offline',
            "{$deviceLabel} has stopped reporting. Parent SMS alerts may be delayed.",
            'error',
            route('platform.sms-gateway.devices.index', absolute: false),
            route('portal.sms-gateway.index', absolute: false),
        );
    }

    public function notifyGatewayRecovered(string $deviceLabel): void
    {
        $this->notifyOperationsAudience(
            'gateway_recovered',
            'SMS gateway back online',
            "{$deviceLabel} is reporting normally again.",
            'success',
            route('platform.sms-gateway.devices.index', absolute: false),
            route('portal.sms-gateway.index', absolute: false),
        );
    }

    public function notifySmsBacklogDelayed(int $pendingCount, int $ageMinutes): void
    {
        $this->notifyOperationsAudience(
            'sms_backlog_delayed',
            'Parent SMS alerts delayed',
            "{$pendingCount} messages are pending; the oldest has waited {$ageMinutes} minutes.",
            'error',
            route('platform.sms-gateway.devices.index', absolute: false),
            route('portal.sms-gateway.index', absolute: false),
        );
    }

    public function notifySmsBacklogRecovered(): void
    {
        $this->notifyOperationsAudience(
            'sms_backlog_recovered',
            'SMS backlog cleared',
            'Pending parent SMS alerts are moving normally again.',
            'success',
            route('platform.sms-gateway.devices.index', absolute: false),
            route('portal.sms-gateway.index', absolute: false),
        );
    }

    public function notifySmsFailures(int $failureCount): void
    {
        $this->notifyOperationsAudience(
            'sms_delivery_failed',
            'SMS delivery failures detected',
            "{$failureCount} parent SMS ".($failureCount === 1 ? 'alert has' : 'alerts have').' failed in the last 24 hours.',
            'error',
            route('platform.sms-log.index', ['status' => 'failed'], false),
            route('portal.sms-gateway.index', absolute: false),
        );
    }

    public function notifyImportResult(ImportBatch $batch): void
    {
        if (! in_array($batch->status, [
            ImportBatchStatus::CompletedWithExceptions,
            ImportBatchStatus::Failed,
        ], true)) {
            return;
        }

        $failed = $batch->status === ImportBatchStatus::Failed;
        $reviewCount = (int) ($batch->summary['manual_review'] ?? 0);
        $recipients = User::query()
            ->where('is_active', true)
            ->where(function ($query) use ($batch): void {
                $query->where('id', $batch->created_by_user_id)
                    ->orWhere(function ($query) use ($batch): void {
                        $query->where('tenant_id', $batch->tenant_id)
                            ->where('role', UserRole::TenantAdmin);
                    });
            })
            ->get();

        $this->send($recipients, new WebAlertNotification(
            category: $failed ? 'import_failed' : 'import_needs_review',
            title: $failed ? 'Import failed' : 'Import needs review',
            message: $failed
                ? (string) ($batch->summary['failure_reason'] ?? 'The import could not be completed.')
                : "The import completed with {$reviewCount} ".($reviewCount === 1 ? 'item' : 'items').' requiring review.',
            severity: $failed ? 'error' : 'warning',
            actionUrl: route('portal.imports.show', $batch, false),
            tenantName: $batch->tenant?->name,
        ));
    }

    private function notifyStationAudience(
        Station $station,
        string $category,
        string $title,
        string $message,
        string $severity,
    ): void {
        $tenantUsers = User::query()
            ->where('tenant_id', $station->tenant_id)
            ->where('is_active', true)
            ->whereIn('role', [UserRole::TenantAdmin, UserRole::TenantOperator])
            ->get();

        $this->send($tenantUsers, new WebAlertNotification(
            $category,
            $title,
            $message,
            $severity,
            route('portal.stations.show', $station, false),
            $station->tenant?->name,
        ));

        $oversightUsers = User::query()
            ->where('role', UserRole::AdaptivestationAdmin)
            ->where('is_active', true)
            ->get();

        $this->send($oversightUsers, new WebAlertNotification(
            $category,
            $title,
            $message,
            $severity,
            route('oversight.schools.index', absolute: false),
            $station->tenant?->name,
        ));
    }

    private function notifyOperationsAudience(
        string $category,
        string $title,
        string $message,
        string $severity,
        string $platformActionUrl,
        string $oversightActionUrl,
    ): void {
        $this->sendToRole(
            UserRole::PlatformSuperAdmin,
            new WebAlertNotification($category, $title, $message, $severity, $platformActionUrl),
        );
        $this->sendToRole(
            UserRole::AdaptivestationAdmin,
            new WebAlertNotification($category, $title, $message, $severity, $oversightActionUrl),
        );
    }

    private function sendToRole(UserRole $role, WebAlertNotification $notification): void
    {
        /** @var Collection<int, User> $recipients */
        $recipients = User::query()
            ->where('role', $role)
            ->where('is_active', true)
            ->get();

        $this->send($recipients, $notification);
    }

    /** @param Collection<int, User> $recipients */
    private function send(Collection $recipients, WebAlertNotification $notification): void
    {
        $enabledRecipients = $recipients
            ->filter(fn (User $user): bool => WebNotificationPreferences::receivesCategory($user, $notification->category))
            ->values();

        Notification::send($enabledRecipients, $notification);
    }
}
