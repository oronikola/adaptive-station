<?php

namespace App\Models;

use App\Enums\ImportBatchStatus;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Date;

#[Fillable([
    'tenant_id', 'integration_profile_id', 'source_system', 'source_description', 'status',
    'started_at', 'finished_at', 'summary', 'created_by_user_id',
])]
#[ScopedBy(TenantScope::class)]
class ImportBatch extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    /** Lives in the per-tenant physical database, not the central one. */
    protected $connection = 'tenant';

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'status' => ImportBatchStatus::class,
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

    public function exceptions(): HasMany
    {
        return $this->hasMany(ImportException::class);
    }

    public static function start(string $tenantId, ?string $integrationProfileId, string $sourceSystem, ?string $sourceDescription, User $actor): self
    {
        return static::create([
            'tenant_id' => $tenantId,
            'integration_profile_id' => $integrationProfileId,
            'source_system' => $sourceSystem,
            'source_description' => $sourceDescription,
            'status' => ImportBatchStatus::Draft,
            'created_by_user_id' => $actor->id,
        ]);
    }

    public function markImporting(): self
    {
        $this->forceFill([
            'status' => ImportBatchStatus::Importing,
            'started_at' => $this->started_at ?? Date::now(),
        ])->save();

        return $this;
    }

    public function complete(array $summary): self
    {
        $status = ($summary['manual_review'] ?? 0) > 0
            ? ImportBatchStatus::CompletedWithExceptions
            : ImportBatchStatus::Completed;

        $this->forceFill([
            'status' => $status,
            'finished_at' => Date::now(),
            'summary' => $summary,
        ])->save();

        return $this;
    }

    public function fail(string $reason): self
    {
        $this->forceFill([
            'status' => ImportBatchStatus::Failed,
            'finished_at' => Date::now(),
            'summary' => [...($this->summary ?? []), 'failure_reason' => $reason],
        ])->save();

        return $this;
    }
}
