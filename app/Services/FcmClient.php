<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Minimal FCM HTTP v1 client — no firebase/kreait SDK, since that pulls in a
 * guzzle major version and a JWT/sodium dependency chain this project's
 * pinned lockfile can't satisfy (see the composer resolution failure this
 * was built to avoid). The OAuth2 service-account exchange only needs an
 * RS256-signed JWT, which openssl_sign() already does without a library.
 */
class FcmClient
{
    /**
     * @return array{ok: bool, unregistered?: bool, status?: int}
     */
    public function send(string $deviceToken, string $title, string $body, array $data = []): array
    {
        $projectId = config('services.fcm.project_id');
        $accessToken = $this->accessToken();

        if (blank($projectId) || $accessToken === null) {
            Log::warning('FCM is not configured; skipping push notification.');

            return ['ok' => false];
        }

        $response = Http::withToken($accessToken)
            ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                'message' => [
                    'token' => $deviceToken,
                    'notification' => ['title' => $title, 'body' => $body],
                    // FCM's API requires a JSON object here — json_encode([])
                    // produces "[]" (an array), which FCM rejects, so an
                    // empty $data must be encoded as {} instead.
                    'data' => empty($data) ? new \stdClass : array_map('strval', $data),
                ],
            ]);

        if ($response->successful()) {
            return ['ok' => true];
        }

        return [
            'ok' => false,
            'unregistered' => $this->isUnregistered($response),
            'status' => $response->status(),
        ];
    }

    /**
     * FCM's actual error code for a stale/uninstalled-app token lives
     * nested in error.details[].errorCode (an FcmError detail object), not
     * the top-level error.status — that field is usually "NOT_FOUND"
     * instead, which alone isn't specific enough to safely delete a token
     * over (a malformed token could also 404-ish).
     */
    protected function isUnregistered(Response $response): bool
    {
        $details = $response->json('error.details') ?? [];

        foreach ($details as $detail) {
            if (($detail['errorCode'] ?? null) === 'UNREGISTERED') {
                return true;
            }
        }

        return false;
    }

    /**
     * Cached ~55 minutes (Google-issued tokens last 60) so a batch of taps
     * shares one token exchange instead of one per notification sent.
     */
    protected function accessToken(): ?string
    {
        $path = config('services.fcm.credentials_path');
        if (blank($path) || ! File::exists($path)) {
            return null;
        }

        return Cache::remember('fcm_oauth_access_token', now()->addMinutes(55), function () use ($path) {
            $credentials = json_decode(File::get($path), true, flags: JSON_THROW_ON_ERROR);
            $jwt = $this->signServiceAccountJwt($credentials);

            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if (! $response->successful()) {
                Log::error('FCM OAuth2 token exchange failed.', ['status' => $response->status()]);

                return null;
            }

            return $response->json('access_token');
        });
    }

    protected function signServiceAccountJwt(array $credentials): string
    {
        $now = time();
        $segments = [
            $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
            $this->base64UrlEncode(json_encode([
                'iss' => $credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'iat' => $now,
                'exp' => $now + 3600,
            ])),
        ];

        openssl_sign(implode('.', $segments), $signature, $credentials['private_key'], 'SHA256');
        $segments[] = $this->base64UrlEncode($signature);

        return implode('.', $segments);
    }

    protected function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
