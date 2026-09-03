<?php

namespace Tests\Feature\Platform;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_view_the_cross_tenant_audit_log(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();

        Tenant::provision([
            'name' => 'Some School',
            'code' => 'some-school',
            'timezone' => 'Asia/Manila',
        ], $platformAdmin);

        $this->actingAs($platformAdmin)->get(route('platform.audit-log.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('logs.data')
                ->where('logs.data.0.action', 'tenant.created'));
    }
}
