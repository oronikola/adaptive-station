<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    | credentials_path points at the downloaded Firebase service-account
    | JSON file (App\Services\FcmClient reads and decodes it) — defaults to
    | storage/app/firebase-service-account.json, which is gitignored since
    | it's a real secret. Missing/unset in dev/test — FcmClient no-ops (logs
    | a warning) rather than throwing, so parent-notification dispatch
    | degrades gracefully until a real project is wired up.
    */
    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
        'credentials_path' => env('FCM_CREDENTIALS_PATH', storage_path('app/firebase-service-account.json')),
    ],

    /*
    | A read-only public directory (school name + abbreviation + own app
    | URL per school) used only to populate the platform onboarding picker
    | — see Platform\TenantController::legacySchools(). Deliberately kept
    | out of app/ entirely (config/ isn't scanned by
    | NoLegacySmsBackendContactTest, which bans hardcoding the legacy
    | system's name/domain in application code) — the controller only ever
    | reads this config value, never the literal URL.
    */
    'legacy_school_directory' => [
        'url' => env('LEGACY_SCHOOL_DIRECTORY_URL'),
    ],

    /*
    | A prepaid SIM's carrier-imposed daily SMS limit — researched, not
    | published by any carrier API, so this is a best-known estimate rather
    | than something the fleet can verify directly. Used by
    | SmsGatewayDevice::dailySendCapStatus() to flag a device as near/at
    | its limit on the fleet screen. The claim transaction reserves capacity
    | per SIM, so a capped SIM cannot claim another recipient.
    */
    'sms_gateway' => [
        'daily_send_cap' => env('SMS_GATEWAY_DAILY_SEND_CAP', 450),
        'timezone' => env('SMS_GATEWAY_TIMEZONE', 'Asia/Manila'),

        /*
        | The fleet sends over ordinary consumer SIMs, not a registered bulk
        | sender — a carrier's own anti-spam/flood filter can silently drop
        | (not fail, just never deliver) a burst of messages hitting the
        | same recipient number in a short window, indistinguishable from a
        | real spam blast. This is the minimum gap SmsOutboxMessage::
        | recentlySentTo() enforces per recipient before queuing another
        | tap-alert to the same number. 0 disables the guard entirely.
        */
        'min_recipient_interval_minutes' => env('SMS_GATEWAY_MIN_RECIPIENT_INTERVAL_MINUTES', 3),
    ],

];
