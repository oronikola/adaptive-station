<?php

namespace App\Models;

use App\Enums\TenantStatus;
use App\Models\Concerns\HasUuidV4;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

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
}
