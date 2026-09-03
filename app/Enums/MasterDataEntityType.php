<?php

namespace App\Enums;

enum MasterDataEntityType: string
{
    case Person = 'person';
    case RfidCard = 'rfid_card';
    case TenantConfig = 'tenant_config';
    case StationConfig = 'station_config';
}
