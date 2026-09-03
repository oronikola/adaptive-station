<?php

namespace App\Enums;

enum StationStatus: string
{
    case PendingActivation = 'pending_activation';
    case Active = 'active';
    case Disabled = 'disabled';
    case Retired = 'retired';
}
