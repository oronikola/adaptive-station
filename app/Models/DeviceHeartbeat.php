<?php

namespace App\Models;

use App\Enums\DeviceHeartbeatStatus;
use App\Models\Concerns\HasTenantScope;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'station_id', 'app_version', 'pending_event_count', 'status', 'reported_at'])]
#[ScopedBy(TenantScope::class)]
class DeviceHeartbeat extends Model implements TenantScoped
{
    use HasTenantScope;

    /** Lives in the per-tenant physical database, not the central one. */
    protected $connection = 'tenant';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'pending_event_count' => 'integer',
            'status' => DeviceHeartbeatStatus::class,
            'reported_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }
}
