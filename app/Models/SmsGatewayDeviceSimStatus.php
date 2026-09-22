<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV4;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['device_id', 'sim_slot', 'carrier', 'status', 'balance_centavos', 'source', 'checked_at', 'last_error'])]
class SmsGatewayDeviceSimStatus extends Model
{
    use HasUuidV4;

    protected $connection = 'mysql';

    protected function casts(): array
    {
        return [
            'balance_centavos' => 'integer',
            'checked_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(SmsGatewayDevice::class, 'device_id');
    }

    public function canSend(): bool
    {
        return in_array($this->status, ['has_load', 'unknown'], true);
    }
}
