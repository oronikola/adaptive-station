<?php

namespace App\Enums;

enum AuditActorType: string
{
    case User = 'user';
    case Station = 'station';
    case System = 'system';
}
