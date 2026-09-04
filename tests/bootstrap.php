<?php

use Illuminate\Contracts\Console\Kernel;

/**
 * Runs once before the whole PHPUnit suite starts (see phpunit.xml's
 * bootstrap="tests/bootstrap.php") — separate from Laravel's normal
 * per-test RefreshDatabase lifecycle, deliberately: RefreshDatabase's
 * "migrate once" step only knows how to migrate the default connection's
 * schema. The 'tenant' connection's own physical test database
 * (TENANT_DB_DATABASE, config/database.php) needs its own one-time
 * migrate:fresh against database/migrations/tenant, done here so it happens
 * before any test's transaction wrapping begins.
 */

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$kernel->call('migrate:fresh', [
    '--database' => 'tenant',
    '--path' => 'database/migrations/tenant',
    '--force' => true,
]);
