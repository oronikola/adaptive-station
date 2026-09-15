<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class WebAlertNotification extends Notification
{
    public function __construct(
        public readonly string $category,
        public readonly string $title,
        public readonly string $message,
        public readonly string $severity,
        public readonly string $actionUrl,
        public readonly ?string $tenantName = null,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'category' => $this->category,
            'title' => $this->title,
            'message' => $this->message,
            'severity' => $this->severity,
            'action_url' => $this->actionUrl,
            'tenant_name' => $this->tenantName,
        ];
    }
}
