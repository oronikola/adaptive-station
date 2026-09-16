<?php

namespace Tests\Feature\Platform;

use App\Enums\StationStatus;
use App\Enums\TenantStatus;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_view_the_dashboard(): void
    {
        $admin = User::factory()->platformSuperAdmin()->create();

        $this->actingAs($admin)->get(route('platform.dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/dashboard/dashboard-screen'));
    }

    public function test_tenant_admin_cannot_view_the_platform_dashboard(): void
    {
        $tenant = Tenant::factory()->create();
        $admin = User::factory()->tenantAdmin($tenant)->create();

        $this->actingAs($admin)->get(route('platform.dashboard'))->assertForbidden();
    }

    public function test_growth_reflects_cumulative_onboarded_and_active_clients(): void
    {
        $this->travelTo(Date::parse('2026-09-15 12:00:00', 'UTC'));
        $admin = User::factory()->platformSuperAdmin()->create();
        Tenant::factory()->create([
            'status' => TenantStatus::Active,
            'created_at' => Date::parse('2026-08-25 12:00:00', 'UTC'),
        ]);

        $this->actingAs($admin)->get(route('platform.dashboard'))
            ->assertInertia(fn ($page) => $page
                ->has('growth', 8)
                ->where('growth.0.total', 0)
                ->where('growth.0.active', 0)
                ->where('growth.7.date', '2026-09-15')
                ->where('growth.7.total', 1)
                ->where('growth.7.active', 1));
    }

    public function test_status_counts_split_active_suspended_and_archived_clients(): void
    {
        $admin = User::factory()->platformSuperAdmin()->create();
        Tenant::factory()->create(['status' => TenantStatus::Active]);
        Tenant::factory()->create(['status' => TenantStatus::Suspended]);
        Tenant::factory()->create(['status' => TenantStatus::Archived]);

        $this->actingAs($admin)->get(route('platform.dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('statusCounts.active', 1)
                ->where('statusCounts.suspended', 1)
                ->where('statusCounts.archived', 1)
                ->where('stats.tenant_count', 3)
                ->where('stats.active_tenant_count', 1));
    }

    public function test_summary_cards_include_actionable_client_and_station_breakdowns(): void
    {
        $this->travelTo(Date::parse('2026-09-15 12:00:00', 'UTC'));
        $admin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create(['created_at' => Date::now()->subDays(10)]);
        Tenant::factory()->create([
            'status' => TenantStatus::Suspended,
            'created_at' => Date::now()->subDays(45),
        ]);
        Station::factory()->for($tenant)->create(['status' => StationStatus::Active]);
        Station::factory()->for($tenant)->create(['status' => StationStatus::PendingActivation]);
        Station::factory()->for($tenant)->create(['status' => StationStatus::Disabled]);

        $this->actingAs($admin)->get(route('platform.dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('stats.new_tenant_count', 1)
                ->where('stats.inactive_tenant_count', 1)
                ->where('stats.station_count', 3)
                ->where('stats.active_station_count', 1)
                ->where('stats.pending_station_count', 1)
                ->where('stats.disabled_station_count', 1)
                ->where('stats.retired_station_count', 0));
    }
}
