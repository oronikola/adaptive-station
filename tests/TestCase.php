<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * RefreshDatabase wraps both the central ('mysql') and per-tenant
     * ('tenant') connections in a transaction per test, rolled back
     * afterward — the 'tenant' connection's schema itself is migrated once
     * for the whole run by tests/bootstrap.php, separately from this.
     */
    protected $connectionsToTransact = ['mysql', 'tenant'];
}
