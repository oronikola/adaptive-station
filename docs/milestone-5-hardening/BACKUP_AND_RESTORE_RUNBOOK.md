# Backup and Restore Runbook

**Milestone:** 5 (IP-006 work items 1, 4)
**Status:** Ready to execute
**Sources:** `ADAPTIVE_STATION_DATABASE_DESIGN.md` §9, `docs/master/SYSTEM_ARCHITECTURE.md` (kiosk local SQLite schema), `config/retention.php`

## 1. MySQL Backup

Adaptive Station's database is the system of record for people, cards, tap events, tenants, stations, and integration/import history — back it up on a real schedule, not ad hoc.

**Daily full backup** (adjust credentials/host to the production environment):

```bash
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" \
  "$DB_DATABASE" | gzip > "adaptive_station_$(date +%Y%m%d_%H%M%S).sql.gz"
```

- `--single-transaction` avoids locking tables on InnoDB (all Adaptive Station tables are InnoDB per the DB design).
- Store backups off the application server (object storage or a separate backup host) — a backup that lives only on the machine it protects doesn't survive that machine's failure.
- Retain at minimum: 7 daily, 4 weekly, and 3 monthly backups, or per the school's/tenant's actual data-retention agreement.

## 2. MySQL Restore

Restore procedure (verify against a staging database first, never restore directly into production without a rehearsal):

```bash
gunzip -c adaptive_station_20260901_020000.sql.gz | mysql \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" \
  "$DB_DATABASE_RESTORE_TARGET"
```

**Restore test checklist** (run at least once per quarter, and required before go-live per IP-006's release gates):

- [ ] Restore into a separate, non-production database.
- [ ] `php artisan migrate:status` shows no pending migrations against the restored copy.
- [ ] Spot-check tenant isolation still holds: a `Person`/`RfidCard`/`TapEvent` row from one tenant is not visible under another tenant's context (this is enforced by `TenantScope`, but a restore is exactly the kind of operation that could reintroduce cross-tenant leakage if done into the wrong target).
- [ ] Row counts for `tenants`, `people`, `tap_events` roughly match the source at backup time.
- [ ] Document the actual restore duration — this becomes the RTO (recovery time objective) communicated to school stakeholders during an incident.

## 3. Kiosk Local SQLite Backup

Per `ADAPTIVE_STATION_DATABASE_DESIGN.md` §9: "Kiosk support procedures must export/backup SQLite before a reset, hardware replacement, or major troubleshooting action." The kiosk's local database (`local_identity`, `people_cache`, `rfid_cards_cache`, `tap_events`, `sync_state`, `audit_log`, `setup` — see `ADAPTIVE_STATION_DATABASE_DESIGN.md` §5) is disposable *cache* for `people_cache`/`rfid_cards_cache` (re-downloaded from the cloud on next sync) but the **local `tap_events` table can contain not-yet-synced offline events that would otherwise be lost**.

Before any kiosk reset, hardware replacement, or major troubleshooting step:

1. Copy the kiosk's SQLite database file to a separate location (USB drive or network share) — the exact file path is kiosk-app-specific; confirm with the kiosk application's own documentation before executing this for the first time on a real device.
2. Confirm `sync_state.last_upload_at` is recent (ideally: the kiosk had connectivity within the last sync interval) — if not, prioritize getting the device back online to flush pending events over immediately wiping it.
3. If a reset is unavoidable while events are still `pending` in the local `tap_events` table, retain the copied SQLite file until support has confirmed (via the portal's attendance search, filtered by that station) that no in-flight taps were lost.

## 4. Operational Data Retention (automated)

`php artisan retention:prune` (scheduled daily at 02:00 per `PRODUCTION_DEPLOYMENT_RUNBOOK.md` §4) prunes:

| Table | Default window | Config variable |
|---|---|---|
| `device_heartbeats` | 90 days | `RETENTION_DEVICE_HEARTBEATS_DAYS` |
| `audit_logs` | 365 days | `RETENTION_AUDIT_LOGS_DAYS` |
| `integration_runs` (completed only — succeeded/failed/partial; `queued`/`running` rows are never pruned regardless of age) | 180 days | `RETENTION_INTEGRATION_RUNS_DAYS` |

This command deliberately never touches `tap_events`, `people`, `rfid_cards`, `import_batches`, or `import_exceptions` — those are durable records with tenant-specific or legal retention requirements, not an infra default. Run manually with `php artisan retention:prune` at any time to check current effect; it reports counts deleted per table on each run.
