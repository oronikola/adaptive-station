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

#[Fillable(['tenant_id', 'date', 'is_school_day', 'label'])]
#[ScopedBy(TenantScope::class)]
class AttendanceCalendarDay extends Model implements TenantScoped
{
    use HasFactory, HasTenantScope, HasUuidV4;

    protected $connection = 'tenant';

    protected function casts(): array
    {
        return ['date' => 'date', 'is_school_day' => 'boolean'];
    }
}
