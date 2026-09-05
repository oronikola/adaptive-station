<?php

namespace App\Models;

use App\Enums\TenantStatus;
use App\Models\Concerns\HasUuidV4;
use App\Support\TenantDatabase;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * @internal every school has its own physical MySQL database
 * (adaptive_station_{code} — see App\Support\TenantDatabase and
 * database/migrations/tenant/). Only this row, plus the handful of central
 * tables that must resolve a tenant before its database connection can even
 * be chosen (users, station_credentials, station_activation_codes,
 * audit_logs), live in the shared central database.
 */
#[Fillable(['name', 'code', 'timezone', 'status', 'attendance_policy', 'notification_policy', 'settings'])]
class Tenant extends Model
{
    use HasFactory, HasUuidV4;

    /**
     * Explicit, not just "the default connection by omission" — every
     * tenant-connection model's belongsTo(Tenant::class) relation would
     * otherwise silently inherit the CALLER's connection (Eloquent's
     * newRelatedInstance() does this whenever the related model has no
     * $connection of its own), pointing Tenant lookups at the wrong
     * database. Same reasoning applies to User/StationCredential/
     * StationActivationCode/AuditLog.
     */
    protected $connection = 'mysql';

    /**
     * Route-model binding (and `route('platform.tenants.show', $tenant)`
     * URL generation) resolves by `code`, not the UUID `id` — the platform
     * super admin browses tenants by their own short, human-chosen slug
     * ("example-school"), and a raw UUID in the address bar tells them
     * nothing. `code` is unique platform-wide (StoreTenantRequest), so this
     * is safe as a lookup key.
     */
    public function getRouteKeyName(): string
    {
        return 'code';
    }

    protected function casts(): array
    {
        return [
            'status' => TenantStatus::class,
            'attendance_policy' => 'array',
            'notification_policy' => 'array',
            'settings' => 'array',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function stations(): HasMany
    {
        return $this->hasMany(Station::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Provisions a new tenant (school): the central row, then its own
     * physical database (adaptive_station_{code}), migrated synchronously in
     * the same request. If database creation or migration fails, the tenant
     * is never left half-provisioned — the (possibly partial) database is
     * dropped and the central row deleted, then the failure is re-thrown.
     */
    public static function provision(array $attributes, ?User $actor = null): self
    {
        $tenant = DB::transaction(function () use ($attributes, $actor) {
            $tenant = static::create([
                ...$attributes,
                'status' => TenantStatus::Active,
            ]);

            AuditLog::record('tenant.created', $actor, $tenant->id, 'tenant', $tenant->id);

            return $tenant;
        });

        // TenantDatabase's own methods already no-op in testing (the whole
        // suite shares one fixed tenant database — see TenantDatabase's
        // docblock), but skip the artisan round-trip entirely here too,
        // rather than let it run a real (redundant, no-op) migrate command
        // against that shared database on every single test.
        if (app()->environment('testing') && ! TenantDatabase::$forceRealDatabaseOperations) {
            return $tenant;
        }

        try {
            TenantDatabase::createDatabase($tenant->code);
            Artisan::call('tenants:migrate', ['code' => $tenant->code]);
        } catch (\Throwable $e) {
            TenantDatabase::dropDatabase($tenant->code);
            AuditLog::allTenants()->where('tenant_id', $tenant->id)->delete();
            $tenant->delete();

            throw $e;
        }

        return $tenant;
    }

    /**
     * Stations live one physical database per tenant — there is no single
     * query that counts across all of them, so this loops every tenant's own
     * database and sums in PHP. Shared by the platform dashboard and the
     * clients list, both of which need the same platform-wide totals.
     */
    public static function platformStationTotals(): array
    {
        $total = 0;
        $active = 0;

        foreach (static::all() as $tenant) {
            TenantDatabase::use($tenant);
            $total += Station::allTenants()->count();
            $active += Station::allTenants()->where('status', 'active')->count();
        }

        return ['total' => $total, 'active' => $active];
    }

    public static function updateStatus(self $tenant, TenantStatus $status, ?User $actor = null): self
    {
        return DB::transaction(function () use ($tenant, $status, $actor) {
            $tenant->forceFill(['status' => $status])->save();

            AuditLog::record('tenant.status_updated', $actor, $tenant->id, 'tenant', $tenant->id, [
                'status' => $status->value,
            ]);

            return $tenant;
        });
    }

    /**
     * Irreversibly deletes a tenant. Row-level deletes across every
     * tenant-owned table remain the authoritative removal mechanism (not
     * just DROP DATABASE) so this is correct and testable identically
     * whether or not physical per-tenant separation is in play — the whole
     * test suite shares one physical tenant database (TenantDatabase's own
     * docblock), so DROP DATABASE alone would silently do nothing there.
     * DROP DATABASE runs afterward as real cleanup in non-testing
     * environments, reclaiming the disk space these deletes leave behind.
     *
     * The caller (Portal\TenantController::destroy) is responsible for
     * requiring the operator to re-type the tenant's code before calling
     * this — there is no undo once it runs.
     */
    public static function purge(self $tenant, ?User $actor = null): void
    {
        $tenantId = $tenant->id;
        $code = $tenant->code;
        $snapshot = ['name' => $tenant->name, 'code' => $code];

        TenantDatabase::use($tenant);
        $stationIds = Station::allTenants()->pluck('id');

        ImportException::allTenants()->where('tenant_id', $tenantId)->delete();
        ImportBatch::allTenants()->where('tenant_id', $tenantId)->delete();
        IntegrationRun::allTenants()->where('tenant_id', $tenantId)->delete();
        IntegrationProfile::allTenants()->where('tenant_id', $tenantId)->delete();
        DeviceHeartbeat::allTenants()->where('tenant_id', $tenantId)->delete();
        DeviceSyncCursor::allTenants()->whereIn('station_id', $stationIds)->delete();
        TapEvent::allTenants()->where('tenant_id', $tenantId)->delete();
        MasterDataChange::allTenants()->where('tenant_id', $tenantId)->delete();
        RfidCard::allTenants()->where('tenant_id', $tenantId)->delete();
        Person::allTenants()->where('tenant_id', $tenantId)->forceDelete();
        Station::allTenants()->where('tenant_id', $tenantId)->delete();

        DB::transaction(function () use ($tenant, $tenantId, $stationIds, $actor, $snapshot) {
            StationActivationCode::allTenants()->whereIn('station_id', $stationIds)->delete();
            StationCredential::allTenants()->whereIn('station_id', $stationIds)->delete();
            User::where('tenant_id', $tenantId)->delete();
            AuditLog::allTenants()->where('tenant_id', $tenantId)->delete();

            $tenant->delete();

            // tenant_id is null here deliberately — this tenant's own audit
            // trail was just wiped above, so the one record of its deletion
            // lives at the platform level, not scoped to the (now-gone) tenant.
            AuditLog::record('tenant.purged', $actor, null, 'tenant', $tenantId, $snapshot);
        });

        // DROP DATABASE is DDL (implicit commit, not part of the transaction
        // above) — done last, after the central bookkeeping is safely
        // committed, so a failure here never leaves central rows half-deleted.
        // No-ops in testing (see TenantDatabase::skipInTesting()) since the
        // row-level deletes above already did the real work there.
        TenantDatabase::dropDatabase($code);
    }
}
