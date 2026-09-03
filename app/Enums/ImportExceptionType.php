<?php

namespace App\Enums;

enum ImportExceptionType: string
{
    case ValidationError = 'validation_error';
    case AmbiguousDuplicate = 'ambiguous_duplicate';
    case MissingReference = 'missing_reference';
    case UnsupportedData = 'unsupported_data';
}
