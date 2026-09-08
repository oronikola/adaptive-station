<?php

namespace App\Enums;

enum AuditActorType: string
{
    case User = 'user';
    case Station = 'station';
    case ParentAccount = 'parent_account';
    case System = 'system';
}
