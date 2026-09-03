<?php

namespace App\Enums;

enum DeviceHeartbeatStatus: string
{
    case Online = 'online';
    case Degraded = 'degraded';
    case OfflineReported = 'offline_reported';
}
