<?php

namespace App\Support;

use Illuminate\Notifications\DatabaseNotification;

class WebNotificationData
{
    /** @return array<string, mixed> */
    public static function from(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'category' => $notification->data['category'] ?? 'information',
            'title' => $notification->data['title'] ?? 'Notification',
            'message' => $notification->data['message'] ?? '',
            'severity' => $notification->data['severity'] ?? 'info',
            'action_url' => $notification->data['action_url'] ?? route('dashboard', absolute: false),
            'tenant_name' => $notification->data['tenant_name'] ?? null,
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
