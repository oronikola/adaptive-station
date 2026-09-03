<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Event batch upload
    |--------------------------------------------------------------------------
    |
    | Maximum number of events a kiosk may submit in a single batch-upload
    | request. Bounds request size/processing time; the kiosk sends any
    | remaining pending events in a subsequent batch.
    |
    */

    'max_batch_size' => env('DEVICE_MAX_BATCH_SIZE', 500),

    /*
    |--------------------------------------------------------------------------
    | Master-data change feed
    |--------------------------------------------------------------------------
    |
    | Maximum number of master_data_changes rows returned per master-data
    | pull request. The kiosk pages through remaining changes using the
    | returned next_cursor/has_more values.
    |
    */

    'master_data_batch_size' => env('DEVICE_MASTER_DATA_BATCH_SIZE', 500),

    /*
    |--------------------------------------------------------------------------
    | Station health
    |--------------------------------------------------------------------------
    |
    | A station is displayed as "online" in the portal when its last_seen_at
    | is within this many minutes — matches the MVP design's stated 5-minute
    | master-data pull cadence during normal online operation.
    |
    */

    'station_offline_threshold_minutes' => env('DEVICE_STATION_OFFLINE_THRESHOLD_MINUTES', 5),

];
