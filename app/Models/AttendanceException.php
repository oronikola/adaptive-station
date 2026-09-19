<?php

namespace App\Models;

use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id', 'person_id', 'tap_event_id', 'attendance_date', 'type', 'status', 'reason',
    'resolved_by_user_id', 'resolved_at',
])]
#[ScopedBy(TenantScope::class)]
class AttendanceException extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    protected $connection = 'tenant';

    protected function casts(): array
    {
        return ['attendance_date' => 'date', 'resolved_at' => 'datetime'];
    }

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }
}
