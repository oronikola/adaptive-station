<?php

namespace App\Enums;

enum IntegrationRunDirection: string
{
    case Import = 'import';
    case Export = 'export';
}
