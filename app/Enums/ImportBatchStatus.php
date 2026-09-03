<?php

namespace App\Enums;

enum ImportBatchStatus: string
{
    case Draft = 'draft';
    case Validating = 'validating';
    case Importing = 'importing';
    case Completed = 'completed';
    case CompletedWithExceptions = 'completed_with_exceptions';
    case Failed = 'failed';
}
