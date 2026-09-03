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
     * Provisions a new tenant (school), recording the mandatory audit log as
     * one atomic unit — every write path that creates a tenant must go
     * through here, never Tenant::create() directly.
     */
    public static function provision(array $attributes, ?User $actor = null): self
    {
        return DB::transaction(function () use ($attributes, $actor) {
            $tenant = static::create([
                ...$attributes,
                'status' => TenantStatus::Active,
            ]);

            AuditLog::record('tenant.created', $actor, $tenant->id, 'tenant', $tenant->id);

            return $tenant;
        });
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
     * Irreversibly deletes a tenant and every row it owns. There is no
     * per-tenant database (ADR-001) — deletion must explicitly walk every
     * tenant-owned table, deepest foreign-key dependents first, since none of
     * the tenant_id/station_id foreign keys cascade at the database level
     * (RESTRICT is MySQL's default). Person uses SoftDeletes elsewhere in the
     * app, but forceDelete() here — a purge means gone, not archived.
     *
     * The caller (Portal\TenantController::destroy) is responsible for
     * requiring the operator to re-type the tenant's code before calling
     * this — there is no undo once it runs.
     */
    public static function purge(self $tenant, ?User $actor = null): void
    {
        DB::transaction(function () use ($tenant, $actor) {
            $tenantId = $tenant->id;
            $snapshot = ['name' => $tenant->name, 'code' => $tenant->code];

            $stationIds = Station::allTenants()->where('tenant_id', $tenantId)->pluck('id');

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
            StationActivationCode::allTenants()->whereIn('station_id', $stationIds)->delete();
            StationCredential::allTenants()->whereIn('station_id', $stationIds)->delete();
            Station::allTenants()->where('tenant_id', $tenantId)->delete();
            User::where('tenant_id', $tenantId)->delete();
            AuditLog::allTenants()->where('tenant_id', $tenantId)->delete();

            $tenant->delete();

            // tenant_id is null here deliberately — this tenant's own audit
            // trail was just wiped above, so the one record of its deletion
            // lives at the platform level, not scoped to the (now-gone) tenant.
            AuditLog::record('tenant.purged', $actor, null, 'tenant', $tenantId, $snapshot);
        });
    }
}
