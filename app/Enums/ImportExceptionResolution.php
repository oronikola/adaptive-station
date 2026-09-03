<?php

namespace App\Enums;

enum ImportExceptionResolution: string
{
    case Open = 'open';
    case Ignored = 'ignored';
    case Resolved = 'resolved';
}
