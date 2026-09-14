<?php

namespace App\Services\Integrations;

use App\Models\IntegrationProfile;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * The 'essentiel_api' driver — essentiel resolves the tapped RFID (identity +
 * guardian contact) and records the tap in their own taphistory in a single
 * round trip, replacing what legacy_mysql does with a direct database
 * connection (see LegacyMysqlConnector). Every school gets its own base URL
 * (essentiel scopes by subdomain, e.g. app-hcb.essentiel.ph) and its own key.
 */
class EssentielApiConnector
{
    /** Seconds to wait for essentiel's response before giving up — a tap at
     *  the kiosk is waiting on this, so it must fail fast, not hang. */
    protected const REQUEST_TIMEOUT_SECONDS = 5;

    public function __construct(protected string $baseUrl, protected ?string $apiKey) {}

    public static function forProfile(IntegrationProfile $profile): self
    {
        $config = $profile->config_encrypted ?? [];

        return new self(
            rtrim($config['base_url'] ?? '', '/'),
            $config['api_key'] ?? null,
        );
    }

    /**
     * Calls POST /api/v1/tapping/record — essentiel looks up the RFID,
     * writes its own taphistory row, and returns the student/guardian data
     * needed to display the tap and send the SMS, all in one request.
     *
     * @return array{found: bool, reason?: string, status?: string, person?: array, guardians?: array, sms_recipient?: ?string, tap?: array}
     */
    public function record(string $rfid, string $stationId): array
    {
        return $this->client()
            ->post("{$this->baseUrl}/api/v1/tapping/record", [
                'rfid' => $rfid,
                'station_id' => $stationId,
            ])
            ->throw()
            ->json();
    }

    protected function client(): PendingRequest
    {
        $client = Http::acceptJson()->timeout(self::REQUEST_TIMEOUT_SECONDS);

        return $this->apiKey !== null && $this->apiKey !== ''
            ? $client->withToken($this->apiKey)
            : $client;
    }
}
