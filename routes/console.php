<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('retention:prune')->dailyAt('02:00');
Schedule::command('queue:prune-failed')->daily();
Schedule::command('queue:prune-batches --hours=48')->daily();
