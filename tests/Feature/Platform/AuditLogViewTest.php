<?php

namespace Tests\Feature\Platform;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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

    public function test_analytics_are_scoped_to_the_current_filters(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $schoolA = Tenant::factory()->create(['name' => 'Alpha High']);
        $schoolB = Tenant::factory()->create(['name' => 'Beta Academy']);

        $this->log('user', 'user.updated', $schoolA->id);
        $this->log('user', 'user.deactivated', $schoolA->id);
        $this->log('station', 'station.activated', $schoolA->id);
        $this->log('parent_account', 'parent.created', $schoolB->id);
        $this->log('system', 'tenant.status_updated', null, now()->subDays(20));

        $response = $this->actingAs($platformAdmin)->get(route('platform.audit-log.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('stats.total', 5)
            ->where('stats.user', 2)
            ->where('stats.station', 1)
            ->where('stats.parent_account', 1)
            ->where('stats.system', 1)
            ->where('trend.granularity', 'day')
            ->where('schoolAnalytics.0.name', 'Alpha High')
            ->where('schoolAnalytics.0.total', 3)
            ->where('schoolAnalytics.0.share', 75)
            ->where('schoolAnalytics.1.name', 'Beta Academy')
            ->where('schoolAnalytics.1.total', 1)
            ->where('schoolAnalytics.1.share', 25));

        $props = $response->viewData('page')['props'];
        $lastPoint = collect($props['trend']['points'])->last();
        $this->assertSame(4, $lastPoint['total'], 'today bucket should hold the four school-scoped rows');

        $scoped = $this->actingAs($platformAdmin)->get(route('platform.audit-log.index', [
            'actor_type' => 'user',
        ]));
        $scoped->assertInertia(fn ($page) => $page
            ->where('stats.total', 2)
            ->where('stats.user', 2)
            ->where('stats.station', 0)
            ->where('schoolAnalytics.0.total', 2));

        $searched = $this->actingAs($platformAdmin)->get(route('platform.audit-log.index', [
            'search' => 'deactivated',
        ]));
        $searched->assertInertia(fn ($page) => $page->where('stats.total', 1));
    }

    public function test_the_trend_chart_collapses_to_months_for_wide_ranges(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $school = Tenant::factory()->create();

        $this->log('user', 'user.created', $school->id, now()->subDays(200));
        $this->log('station', 'station.created', $school->id, now()->subDays(40));
        $this->log('system', 'tenant.status_updated', null);

        $response = $this->actingAs($platformAdmin)->get(route('platform.audit-log.index', [
            'date_from' => now()->subDays(200)->toDateString(),
            'date_to' => now()->toDateString(),
        ]));

        $props = $response->viewData('page')['props'];
        $this->assertSame('month', $props['trend']['granularity']);
        $this->assertSame(3, array_sum(array_column($props['trend']['points'], 'total')));
        $this->assertGreaterThanOrEqual(5, count($props['trend']['points']));
    }

    private function log(string $actorType, string $action, ?string $tenantId, ?Carbon $at = null): AuditLog
    {
        $log = AuditLog::allTenants()->create([
            'tenant_id' => $tenantId,
            'actor_type' => $actorType,
            'actor_id' => null,
            'action' => $action,
            'entity_type' => null,
            'entity_id' => null,
            'metadata' => null,
        ]);

        if ($at !== null) {
            $log->created_at = $at;
            $log->save();
        }

        return $log;
    }
}
