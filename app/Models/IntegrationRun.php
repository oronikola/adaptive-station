<?php

namespace App\Models;

use App\Enums\IntegrationRunDirection;
use App\Enums\IntegrationRunStatus;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Date;

#[Fillable(['tenant_id', 'integration_profile_id', 'direction', 'status', 'started_at', 'finished_at', 'summary', 'error_message'])]
#[ScopedBy(TenantScope::class)]
class IntegrationRun extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'direction' => IntegrationRunDirection::class,
            'status' => IntegrationRunStatus::class,
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'summary' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(IntegrationProfile::class, 'integration_profile_id');
    }

    public static function start(IntegrationProfile $profile, IntegrationRunDirection $direction): self
    {
        return static::create([
            'tenant_id' => $profile->tenant_id,
            'integration_profile_id' => $profile->id,
            'direction' => $direction,
            'status' => IntegrationRunStatus::Running,
            'started_at' => Date::now(),
        ]);
    }

    public function finish(IntegrationRunStatus $status, array $summary, ?string $errorMessage = null): self
    {
        $this->forceFill([
            'status' => $status,
            'finished_at' => Date::now(),
            'summary' => $summary,
            'error_message' => $errorMessage,
        ])->save();

        if ($status === IntegrationRunStatus::Succeeded) {
            IntegrationProfile::allTenants()->whereKey($this->integration_profile_id)
                ->update(['last_successful_run_at' => $this->finished_at]);
        }

        return $this;
    }
}
