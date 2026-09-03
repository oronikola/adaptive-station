<?php

namespace App\Enums;

enum IntegrationDirection: string
{
    case ImportOnly = 'import_only';
    case ExportOnly = 'export_only';
    case Bidirectional = 'bidirectional';
}
