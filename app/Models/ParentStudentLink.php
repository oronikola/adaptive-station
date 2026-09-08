<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['person_id', 'approved_by'])]
class ParentStudentLink extends Model
{
    protected $connection = 'mysql';

    public function parentAccount(): BelongsTo
    {
        return $this->belongsTo(ParentAccount::class);
    }
}
