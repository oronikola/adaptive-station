# Production Deployment Runbook

**Milestone:** 5 (IP-006 work items 1)
**Status:** Ready to execute
**Sources:** `docs/milestone-0-foundation/ENVIRONMENT_BASELINE.md`, `docs/sys-design-plan/ADAPTIVE_STATION_DATABASE_DESIGN.md` §9, `config/queue.php`, `config/logging.php`, `routes/console.php`

This runbook covers what's needed to run Adaptive Station in production, beyond the local/dev scaffold already in the repo.

## 1. HTTPS

Adaptive Station is API-only for kiosks (ADR-003) — HTTPS is mandatory, not optional, since device tokens travel as bearer headers. Terminate TLS at the web server (Nginx/Caddy) in front of `php-fpm`, or at a load balancer with re-encryption to the app server. Use a certificate from a public CA (Let's Encrypt via certbot is sufficient) and enable HSTS once verified working.

## 2. Environment Variables (production overrides)

Extends the table in `ENVIRONMENT_BASELINE.md`. Set these explicitly — do not rely on `.env.example` defaults, which are development-oriented:

| Variable | Production value | Why |
|---|---|---|
| `APP_ENV` | `production` | Disables debug-only behaviors |
| `APP_DEBUG` | `false` | Never leak stack traces to clients |
| `APP_KEY` | unique per environment | Never reuse a local/staging key — also encrypts `integration_profiles.config_encrypted` |
| `DB_CONNECTION` | `mysql` | SQLite is dev-only |
| `DB_HOST`/`DB_PORT`/`DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD` | real MySQL 8, `utf8mb4` | From a secret manager, never committed |
| `QUEUE_CONNECTION` | `database` (MVP) or `redis` (preferred at scale) | `database` is already proven end-to-end by every feature test in this repo; move to `redis` when queue volume justifies it |
| `SESSION_DRIVER` / `CACHE_STORE` | `database` (MVP) or `redis` | Same reasoning as queue |
| `LOG_CHANNEL` | `stack` | Existing default |
| `LOG_STACK` | `daily,slack` | `daily` (already a stock channel in `config/logging.php`, rotates via `LOG_DAILY_DAYS`) for local retention, `slack` for real-time alerting |
| `LOG_LEVEL` | `error` | `debug` is far too noisy for production volume |
| `LOG_DAILY_DAYS` | `30` | Local log retention before rotation deletes the file |
| `LOG_SLACK_WEBHOOK_URL` | incident-channel webhook | Powers the `slack` channel already wired in `config/logging.php` — only `critical`+ by default |
| `RETENTION_DEVICE_HEARTBEATS_DAYS` / `RETENTION_AUDIT_LOGS_DAYS` / `RETENTION_INTEGRATION_RUNS_DAYS` | 90 / 365 / 180 (defaults) or a school/legal-approved value | Feeds `php artisan retention:prune`, see §4 |

## 3. Queue Workers

`RunLegacyImportJob` and `RunLegacyExportJob` implement `ShouldQueue` — while the portal currently dispatches them with `dispatchSync()` for immediate feedback (see `Portal\ImportBatchController`/`IntegrationProfileController`), a standing queue worker is still required once any code path switches to `::dispatch()` (e.g. a future scheduled/background import), and is good practice regardless so a slow legacy DB connection doesn't hold an HTTP request open.

Run at least one worker process under supervision (sample `supervisor` config):

```ini
[program:adaptive-station-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/adaptive-station/artisan queue:work --sleep=3 --tries=3 --max-time=3600
directory=/var/www/adaptive-station
autostart=true
autorestart=true
numprocs=2
user=www-data
stopwaitsecs=3600
```

Both queued jobs already declare a bounded `$tries=3` and exponential backoff (`[60, 300, 900]` seconds) — see `app/Jobs/RunLegacyImportJob.php`/`RunLegacyExportJob.php` — so a worker restart or a transient legacy-DB connection failure retries safely rather than looping forever (proved idempotent by `LegacyImportJobTest`/`LegacyExportJobTest`).

## 4. Scheduled Jobs

`routes/console.php` registers (Laravel 11+/13 style — no `app/Console/Kernel.php`):

- `retention:prune` — daily at 02:00, prunes `device_heartbeats`/`audit_logs`/completed `integration_runs` per §2's retention variables (never touches `tap_events`, `people`, `rfid_cards`, or import batches/exceptions — those are durable records, not infra cleanup).
- `queue:prune-failed` / `queue:prune-batches --hours=48` — native Laravel housekeeping for the `database` queue driver.

These require the Laravel scheduler to actually run. Add one cron entry on the app server:

```cron
* * * * * cd /var/www/adaptive-station && php artisan schedule:run >> /dev/null 2>&1
```

## 5. Health and Monitoring

- `GET /up` — Laravel's framework-level liveness probe (registered in `bootstrap/app.php`), no dependency checks. Use for a load balancer's basic "is the process alive" check.
- `GET /api/health` — Adaptive Station's own readiness check (`app/Http/Controllers/HealthController.php`): verifies DB connectivity, a cache round-trip, and that the queue's backing table is reachable. Returns `200 {"status":"ok",...}` or `503 {"status":"error",...}`. Point uptime monitoring (e.g. a scheduled ping from an external monitor) at this endpoint, not just `/up`.
- Configure the `slack` log channel (§2) so any `critical`+ log line pages someone — this is the cheapest alerting available without standing up a dedicated APM.

## 6. Backups

See `BACKUP_AND_RESTORE_RUNBOOK.md` — MySQL backup/restore and kiosk SQLite export procedures, plus the retention command from §4.

## 7. Pre-Go-Live Checklist

- [ ] HTTPS certificate installed and verified (§1)
- [ ] All production `.env` values set per §2 — confirm `APP_DEBUG=false` and `APP_KEY` is unique to this environment
- [ ] At least one supervised queue worker running (§3)
- [ ] Scheduler cron entry installed and `php artisan schedule:list` confirms `retention:prune`/`queue:prune-failed`/`queue:prune-batches` are registered
- [ ] `/api/health` returns `200` from the production URL
- [ ] MySQL backup job scheduled and one restore test completed (`BACKUP_AND_RESTORE_RUNBOOK.md`)
- [ ] `SECURITY_AND_RESILIENCE_TEST_EVIDENCE.md` reviewed — no unresolved critical finding
