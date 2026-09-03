<?php

namespace App\Models;

use App\Enums\AuditActorType;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'actor_type', 'actor_id', 'action', 'entity_type', 'entity_id', 'metadata', 'ip_address'])]
#[ScopedBy(TenantScope::class)]
class AuditLog extends Model implements TenantScoped
{
    use HasTenantScope, HasUuidV4;

    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'actor_type' => AuditActorType::class,
            'metadata' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Resolves the actor record for display purposes only (actor_type is a
     * fixed business enum, not a morph-map class discriminator, so this is a
     * plain lookup rather than an Eloquent morphTo() relation).
     */
    public function actor(): ?Model
    {
        return match ($this->actor_type) {
            AuditActorType::User => User::find($this->actor_id),
            AuditActorType::Station => Station::allTenants()->find($this->actor_id),
            default => null,
        };
    }

    public static function record(string $action, ?Model $actor, ?string $tenantId, ?string $entityType = null, ?string $entityId = null, ?array $metadata = null): self
    {
        $actorType = match (true) {
            $actor instanceof User => AuditActorType::User,
            $actor instanceof Station => AuditActorType::Station,
            default => AuditActorType::System,
        };

        return static::allTenants()->create([
            'tenant_id' => $tenantId,
            'actor_type' => $actorType,
            'actor_id' => $actor?->getKey(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'metadata' => $metadata,
            'ip_address' => request()?->ip(),
        ]);
    }
}
