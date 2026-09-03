<?php

namespace App\Enums;

enum MasterDataOperation: string
{
    case Upsert = 'upsert';
    case Deactivate = 'deactivate';
    case Delete = 'delete';
}
