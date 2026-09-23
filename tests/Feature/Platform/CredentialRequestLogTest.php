<?php

namespace Tests\Feature\Platform;

use App\Models\AuditLog;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Covers Platform\CredentialRequestLogController — the cross-school screen
 * built for every outcome of ParentCredentialLookupController::send(), not
 * just the ones that queued an SMS. See that controller's logOutcome().
 */
class CredentialRequestLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_super_admin_can_view_every_outcome_of_a_credential_send_attempt(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $tenant = Tenant::factory()->create();

        $noPhoneAccount = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => null]);
        $this->postJson(route('parents.credentials.send', $noPhoneAccount), ['tenant_id' => $tenant->id])->assertStatus(422);

        $noLinksAccount = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639101603448']);
        $this->postJson(route('parents.credentials.send', $noLinksAccount), ['tenant_id' => $tenant->id])->assertStatus(422);

        $student = Person::factory()->create(['tenant_id' => $tenant->id]);
        $queuedAccount = ParentAccount::factory()->create(['tenant_id' => $tenant->id, 'phone_number' => '+639101603449', 'name' => 'Maria Santos']);
        $queuedAccount->studentLinks()->create(['person_id' => $student->id]);
        $this->postJson(route('parents.credentials.send', $queuedAccount), ['tenant_id' => $tenant->id])
            ->assertOk()->assertJsonPath('status', 'queued');

        $response = $this->actingAs($platformAdmin)->get(route('platform.credential-requests.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('requests.total', 3)
            ->where('stats.total', 3)
            ->where('stats.no_phone', 1)
            ->where('stats.no_students_linked', 1)
            ->where('stats.queued', 1));

        $queuedRow = collect($response->viewData('page')['props']['requests']['data'])
            ->firstWhere('outcome', 'queued');
        $this->assertSame('Maria Santos', $queuedRow['parent_name']);
        $this->assertNotNull($queuedRow['masked_phone']);
    }

    public function test_it_filters_by_school_and_outcome(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $schoolA = Tenant::factory()->create();
        $schoolB = Tenant::factory()->create();

        AuditLog::record('parent.credentials_self_service_no_phone', null, $schoolA->id, 'parent_account', (string) Str::uuid());
        AuditLog::record('parent.credentials_self_service_queued', null, $schoolA->id, 'parent_account', (string) Str::uuid());
        AuditLog::record('parent.credentials_self_service_no_phone', null, $schoolB->id, 'parent_account', (string) Str::uuid());

        $response = $this->actingAs($platformAdmin)->get(route('platform.credential-requests.index', [
            'tenant_id' => $schoolA->id,
            'outcome' => 'no_phone',
        ]));

        $response->assertInertia(fn ($page) => $page
            ->where('requests.total', 1)
            ->where('requests.data.0.outcome', 'no_phone'));
    }

    public function test_analytics_are_scoped_to_the_current_filters(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $schoolA = Tenant::factory()->create(['name' => 'Alpha High']);
        $schoolB = Tenant::factory()->create(['name' => 'Beta Academy']);

        AuditLog::record('parent.credentials_self_service_queued', null, $schoolA->id, 'parent_account', (string) Str::uuid());
        AuditLog::record('parent.credentials_self_service_no_phone', null, $schoolA->id, 'parent_account', (string) Str::uuid());
        $oldAttempt = AuditLog::record('parent.credentials_self_service_rate_limited', null, $schoolA->id, 'parent_account', (string) Str::uuid());
        $oldAttempt->created_at = now()->subDays(20);
        $oldAttempt->save();
        AuditLog::record('parent.credentials_self_service_no_phone', null, $schoolB->id, 'parent_account', (string) Str::uuid());

        $response = $this->actingAs($platformAdmin)->get(route('platform.credential-requests.index'));

        $response->assertInertia(fn ($page) => $page
            ->where('stats.total', 4)
            ->where('stats.queued', 1)
            ->where('stats.success_rate', 25)
            ->where('trend.granularity', 'day')
            ->where('schoolAnalytics.0.name', 'Alpha High')
            ->where('schoolAnalytics.0.total', 3)
            ->where('schoolAnalytics.0.success_rate', 33.3)
            ->where('schoolAnalytics.1.name', 'Beta Academy')
            ->where('schoolAnalytics.1.success_rate', 0));

        $props = $response->viewData('page')['props'];
        $lastPoint = collect($props['trend']['points'])->last();
        $this->assertSame(3, $lastPoint['total'], 'today bucket should hold the three same-day requests');

        $scoped = $this->actingAs($platformAdmin)->get(route('platform.credential-requests.index', [
            'tenant_id' => $schoolB->id,
        ]));
        $scoped->assertInertia(fn ($page) => $page
            ->where('stats.total', 1)
            ->where('stats.queued', 0)
            ->where('stats.success_rate', 0)
            ->where('schoolAnalytics.0.name', 'Beta Academy'));

        $queuedOnly = $this->actingAs($platformAdmin)->get(route('platform.credential-requests.index', [
            'outcome' => 'queued',
        ]));
        $queuedOnly->assertInertia(fn ($page) => $page
            ->where('stats.total', 1)
            ->where('stats.queued', 1)
            ->where('stats.success_rate', 100));
    }

    public function test_the_trend_chart_collapses_to_months_for_wide_ranges(): void
    {
        $platformAdmin = User::factory()->platformSuperAdmin()->create();
        $school = Tenant::factory()->create();

        $ancient = AuditLog::record('parent.credentials_self_service_no_phone', null, $school->id, 'parent_account', (string) Str::uuid());
        $ancient->created_at = now()->subDays(200);
        $ancient->save();
        $recent = AuditLog::record('parent.credentials_self_service_queued', null, $school->id, 'parent_account', (string) Str::uuid());
        $recent->created_at = now()->subDays(40);
        $recent->save();
        AuditLog::record('parent.credentials_self_service_duplicate', null, $school->id, 'parent_account', (string) Str::uuid());

        $response = $this->actingAs($platformAdmin)->get(route('platform.credential-requests.index', [
            'date_from' => now()->subDays(200)->toDateString(),
            'date_to' => now()->toDateString(),
        ]));

        $props = $response->viewData('page')['props'];
        $this->assertSame('month', $props['trend']['granularity']);
        $this->assertSame(3, array_sum(array_column($props['trend']['points'], 'total')));
        $this->assertGreaterThanOrEqual(5, count($props['trend']['points']));
    }

    public function test_a_non_platform_user_cannot_view_it(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('platform.credential-requests.index'))->assertForbidden();
    }
}
