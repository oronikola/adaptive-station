<?php

namespace App\Enums;

enum SmsOutboxStatus: string
{
    case Pending = 'pending';
    case Claimed = 'claimed';
    case Sent = 'sent';
    case Delivered = 'delivered';
    case Failed = 'failed';
    case Expired = 'expired';
}
