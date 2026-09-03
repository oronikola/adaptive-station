<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Operational Data Retention
    |--------------------------------------------------------------------------
    |
    | Per ADAPTIVE_STATION_DATABASE_DESIGN.md §9: device_heartbeats, audit_logs,
    | and completed integration_runs are archived according to an operational
    | retention policy rather than kept forever. tap_events is deliberately
    | NOT pruned here — it is the durable attendance record and its retention
    | is a school-specific legal/business decision, not an infra default.
    |
    */

    'device_heartbeats_days' => (int) env('RETENTION_DEVICE_HEARTBEATS_DAYS', 90),

    'audit_logs_days' => (int) env('RETENTION_AUDIT_LOGS_DAYS', 365),

    'integration_runs_days' => (int) env('RETENTION_INTEGRATION_RUNS_DAYS', 180),

];
