<?php

namespace App\Enums;

enum IntegrationProfileStatus: string
{
    case Active = 'active';
    case Disabled = 'disabled';
    case Error = 'error';
}
