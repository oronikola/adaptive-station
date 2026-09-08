<?php

namespace App\Models;

use App\Models\Concerns\HasTenantScope;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per FCM-registered device for a parent, used to fan out IN/OUT
 * push notifications after a tap event lands (see docs/adr for the tap
 * pipeline). fcm_token is globally unique — Firebase reissues the same
 * token to at most one active registration, so re-registering (e.g. after
 * login on the same device) simply updates the existing row's owner.
 */
#[Fillable(['tenant_id', 'parent_account_id', 'fcm_token', 'platform'])]
#[ScopedBy(TenantScope::class)]
class ParentDeviceToken extends Model implements TenantScoped
{
    use HasTenantScope;

    /** Explicit for the same cross-connection-relation reason as Tenant. */
    protected $connection = 'mysql';

    public function parentAccount(): BelongsTo
    {
        return $this->belongsTo(ParentAccount::class);
    }
}
