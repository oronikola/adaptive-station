<?php

namespace App\Models;

use App\Models\Concerns\HasTenantScope;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['station_id', 'master_data_version', 'last_pull_at', 'last_upload_at', 'last_successful_sync_at'])]
#[ScopedBy(TenantScope::class)]
class DeviceSyncCursor extends Model implements TenantScoped
{
    use HasTenantScope;

    protected $primaryKey = 'station_id';

    public $incrementing = false;

    protected $keyType = 'string';

    const CREATED_AT = null;

    protected function casts(): array
    {
        return [
            'master_data_version' => 'integer',
            'last_pull_at' => 'datetime',
            'last_upload_at' => 'datetime',
            'last_successful_sync_at' => 'datetime',
        ];
    }

    /**
     * device_sync_cursors has no tenant_id column of its own — constrain
     * through the owning station instead of the default column-based filter.
     */
    public function applyTenantScope(Builder $builder, string $tenantId): void
    {
        $builder->whereHas('station', fn (Builder $query) => $query->where('tenant_id', $tenantId));
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }
}
