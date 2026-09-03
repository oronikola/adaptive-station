<?php

namespace App\Models;

use App\Enums\MasterDataEntityType;
use App\Enums\MasterDataOperation;
use App\Models\Concerns\HasTenantScope;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

#[Fillable(['tenant_id', 'version', 'entity_type', 'entity_id', 'operation', 'payload', 'changed_at'])]
#[ScopedBy(TenantScope::class)]
class MasterDataChange extends Model implements TenantScoped
{
    use HasTenantScope;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'entity_type' => MasterDataEntityType::class,
            'operation' => MasterDataOperation::class,
            'payload' => 'array',
            'changed_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Records a master-data change, assigning the next per-tenant `version`
     * safely under concurrent writers. `version` is a per-tenant monotonic
     * sequence, not an auto-increment column, so the next value must be
     * computed under a lock. The `tenants` row itself is used as the mutex —
     * unlike master_data_changes, it is guaranteed to already exist, even for
     * a tenant's very first-ever change (which has no change row to lock).
     */
    public static function record(
        string $tenantId,
        MasterDataEntityType $entityType,
        string $entityId,
        MasterDataOperation $operation,
        ?array $payload = null,
    ): self {
        return DB::transaction(function () use ($tenantId, $entityType, $entityId, $operation, $payload) {
            Tenant::whereKey($tenantId)->lockForUpdate()->firstOrFail();

            $nextVersion = (int) static::allTenants()->where('tenant_id', $tenantId)->max('version') + 1;

            return static::allTenants()->create([
                'tenant_id' => $tenantId,
                'version' => $nextVersion,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'operation' => $operation,
                'payload' => $payload,
                'changed_at' => Date::now(),
            ]);
        });
    }
}
