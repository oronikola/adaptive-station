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

];
