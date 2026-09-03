<?php

namespace Tests\Feature\Security;

use App\Enums\ImportExceptionResolution;
use App\Enums\ImportExceptionType;
use App\Enums\StationStatus;
use App\Enums\TenantStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\ImportBatch;
use App\Models\ImportException;
use App\Enums\IntegrationProfileStatus;
use App\Models\IntegrationProfile;
use App\Models\Person;
use App\Models\RfidCard;
use App\Models\Station;
use App\Models\StationActivationCode;
use App\Models\StationCredential;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression net for ADR-004's mandate that every mutation writes an audit
 * log: exercises every fat-model mutation method once and asserts the full
 * expected set of audit_logs.action values appears — so a future refactor
 * that silently drops an AuditLog::record() call fails a test instead of
 * being caught only in a real security incident review.
 */
class AuditLogCompletenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_mutating_fat_model_method_writes_an_audit_log(): void
    {
        $tenant = Tenant::provision(['name' => 'Audit Test School', 'code' => 'audit-test', 'timezone' => 'Asia/Manila']);
        Tenant::updateStatus($tenant, TenantStatus::Active);

        // These fat-model methods are normally called from an authenticated
        // web request, where SetTenantContext middleware has already resolved
        // the tenant; called directly here (no request), so it must be set
        // explicitly or tenant-scoped relation lookups (e.g. StationCredential
        // ->station) fail closed and return null, per TenantScope's design.
        app(TenantContext::class)->set($tenant->id);

        $admin = User::factory()->tenantAdmin($tenant)->create();

        ['user' => $operator] = User::provisionForTenant($tenant, UserRole::TenantOperator, [
            'name' => 'Operator', 'email' => 'audit-operator@example.test',
        ], $admin);
        User::setActive($operator, false, $admin);
        User::setActive($operator, true, $admin);

        $person = Person::registerForTenant($tenant->id, [
            'person_type' => 'student', 'first_name' => 'Ada', 'last_name' => 'Lovelace',
        ], $admin);
        Person::updateDetails($person, ['section' => 'Diamond'], $admin);
        Person::deactivate($person, $admin);
        Person::reactivate($person, $admin);

        $card = RfidCard::assign($tenant->id, $person->id, 'AUDITCARD1', $admin);
        $card = RfidCard::replace($card, 'AUDITCARD2', $admin);
        RfidCard::deactivate($card, $admin);

        $station = Station::provision(['tenant_id' => $tenant->id, 'name' => 'Front Gate', 'station_code' => 'AUDIT-1'], $admin);
        Station::updateConfiguration($station, ['clock_format' => '24h'], $admin);
        Station::registerLegacyPlaceholder($tenant->id, 'LEGACY-99', $admin);

        $station->forceFill(['status' => StationStatus::Active])->save();
        ['credential' => $credential] = StationCredential::issueFor($station, 'Kiosk 1', $admin);
        StationCredential::revoke($credential, $admin);

        $pendingStation = Station::provision(['tenant_id' => $tenant->id, 'name' => 'Side Gate', 'station_code' => 'AUDIT-2'], $admin);
        ['code' => $code] = StationActivationCode::issueFor($pendingStation, $admin);
        $this->postJson('/api/v1/device/activate', ['activation_code' => $code])->assertCreated();

        $profile = IntegrationProfile::createForTenant($tenant->id, [
            'name' => 'Legacy', 'driver' => 'legacy_mysql', 'direction' => 'import_only',
            'config_encrypted' => ['host' => 'unused'],
        ], $admin);
        IntegrationProfile::updateConfig($profile, ['host' => 'changed'], $admin);
        IntegrationProfile::updateStatus($profile, IntegrationProfileStatus::Active, $admin);

        $batch = ImportBatch::start($tenant->id, $profile->id, 'legacy_mysql', 'Audit test batch', $admin);
        $exception = ImportException::record($tenant->id, $batch->id, 'tap_event', '1', ImportExceptionType::MissingReference, []);
        $exception->resolve($admin, ImportExceptionResolution::Ignored, 'test note');

        $expectedActions = [
            'tenant.created', 'tenant.status_updated',
            'user.created', 'user.deactivated', 'user.reactivated',
            'person.created', 'person.updated', 'person.deactivated', 'person.reactivated',
            'rfid_card.assigned', 'rfid_card.replaced', 'rfid_card.deactivated',
            'station.created', 'station.configuration_updated', 'station.legacy_placeholder_created',
            'station_credential.issued', 'station_credential.revoked',
            'station.activated',
            'integration_profile.created', 'integration_profile.config_updated', 'integration_profile.status_updated',
            'import_exception.resolved',
        ];

        $recordedActions = AuditLog::allTenants()->where('tenant_id', $tenant->id)->pluck('action')->all();

        foreach ($expectedActions as $action) {
            $this->assertContains($action, $recordedActions, "Expected an audit log for action [{$action}].");
        }
    }
}
