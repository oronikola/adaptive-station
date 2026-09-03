<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Distinct from Laravel's default '/up' (bootstrap/app.php) — that route only
 * confirms the framework booted, with no dependency checks, and stays wired
 * to a load balancer's liveness probe. This endpoint verifies the actual
 * dependencies the app needs to serve real traffic: database connectivity,
 * cache read/write, and that the queue's backing table is reachable.
 */
class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'queue' => $this->checkQueue(),
        ];

        $healthy = ! in_array(false, $checks, true);

        return response()->json([
            'status' => $healthy ? 'ok' : 'error',
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }

    protected function checkDatabase(): bool
    {
        try {
            DB::connection()->getPdo();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    protected function checkCache(): bool
    {
        try {
            $key = 'health-check-'.Str::random(8);
            Cache::put($key, true, 5);
            $ok = Cache::get($key) === true;
            Cache::forget($key);

            return $ok;
        } catch (\Throwable) {
            return false;
        }
    }

    protected function checkQueue(): bool
    {
        try {
            $connection = config('queue.default');
            $table = config("queue.connections.{$connection}.table");

            if ($table === null) {
                // Non-database queue driver (redis/sqs/sync) — nothing to probe here.
                return true;
            }

            DB::table($table)->count();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
