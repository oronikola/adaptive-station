<?php

namespace App\Support;

use App\Models\User;

class WebNotificationPreferences
{
    /** @var array<string, list<string>> */
    public const CATEGORY_ALERTS = [
        'stations' => ['station_offline', 'station_recovered'],
        'sms_gateway' => ['gateway_offline', 'gateway_recovered'],
        'sms_delivery' => ['sms_backlog_delayed', 'sms_backlog_recovered', 'sms_delivery_failed'],
        'imports' => ['import_failed', 'import_needs_review'],
    ];

    /** @var array<string, string> */
    public const CATEGORY_LABELS = [
        'stations' => 'Station health',
        'sms_gateway' => 'SMS gateway health',
        'sms_delivery' => 'SMS delivery',
        'imports' => 'Import results',
    ];

    /** @return array{categories: array<string, bool>} */
    public static function for(User $user): array
    {
        $stored = $user->web_notification_preferences ?? [];
        $storedCategories = is_array($stored['categories'] ?? null) ? $stored['categories'] : [];

        return [
            'categories' => array_replace(array_fill_keys(array_keys(self::CATEGORY_ALERTS), true), $storedCategories),
        ];
    }

    public static function receivesCategory(User $user, string $alertCategory): bool
    {
        $group = self::groupForAlert($alertCategory);

        return $group === null || self::for($user)['categories'][$group];
    }

    public static function groupForAlert(string $alertCategory): ?string
    {
        foreach (self::CATEGORY_ALERTS as $group => $alerts) {
            if (in_array($alertCategory, $alerts, true)) {
                return $group;
            }
        }

        return null;
    }
}
