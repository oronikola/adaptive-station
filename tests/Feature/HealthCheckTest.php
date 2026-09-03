<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_reports_ok_when_dependencies_are_reachable(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()->assertJson([
            'status' => 'ok',
            'checks' => [
                'database' => true,
                'cache' => true,
                'queue' => true,
            ],
        ]);
    }
}
