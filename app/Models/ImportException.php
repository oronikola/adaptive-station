<?php

namespace App\Models;

use App\Enums\ImportExceptionResolution;
use App\Enums\ImportExceptionType;
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

#[Fillable([
    'tenant_id', 'import_batch_id', 'entity_type', 'source_record_id', 'exception_type',
    'payload', 'resolution', 'resolved_by_user_id', 'resolved_at',
])]
#[ScopedBy(TenantScope::class)]
class ImportException extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'exception_type' => ImportExceptionType::class,
            'payload' => 'array',
            'resolution' => ImportExceptionResolution::class,
            'resolved_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class, 'import_batch_id');
    }

    public static function record(
        string $tenantId,
        string $importBatchId,
        string $entityType,
        ?string $sourceRecordId,
        ImportExceptionType $type,
        array $payload = [],
    ): self {
        return static::create([
            'tenant_id' => $tenantId,
            'import_batch_id' => $importBatchId,
            'entity_type' => $entityType,
            'source_record_id' => $sourceRecordId,
            'exception_type' => $type,
            'payload' => $payload,
            'resolution' => ImportExceptionResolution::Open,
        ]);
    }

    public function resolve(User $user, ImportExceptionResolution $resolution, ?string $note = null): self
    {
        $payload = $this->payload ?? [];
        if ($note !== null) {
            $payload['resolution_note'] = $note;
        }

        $this->forceFill([
            'resolution' => $resolution,
            'resolved_by_user_id' => $user->id,
            'resolved_at' => Date::now(),
            'payload' => $payload,
        ])->save();

        AuditLog::record('import_exception.resolved', $user, $this->tenant_id, 'import_exception', $this->id, [
            'resolution' => $resolution->value,
        ]);

        return $this;
    }
}
