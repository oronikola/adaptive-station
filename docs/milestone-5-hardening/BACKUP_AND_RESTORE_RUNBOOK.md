# Backup and Restore Runbook

**Milestone:** 5 (IP-006 work items 1, 4)
**Status:** Ready to execute — updated 2026-09-04 for per-tenant physical databases (ADR-005)
**Sources:** `ADAPTIVE_STATION_DATABASE_DESIGN.md` §9, `docs/master/SYSTEM_ARCHITECTURE.md` (kiosk local SQLite schema), `config/retention.php`, [ADR-005](../adr/ADR-005_per-tenant-physical-databases.md)

## 1. MySQL Backup

Each school's data now lives in its own physical database (`adaptive_station_{code}`); a handful of central tables (`tenants`, `users`, `station_credentials`, `station_activation_codes`, `audit_logs`) live in one shared database. Both need backing up — a school's own database backup is useless without the central database that identifies which tenant it belongs to and who can log into it.

**Daily full backup — central database:**

```bash
mysqldump \
  --single-transaction --routines --triggers \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" \
  adaptive_station | gzip > "adaptive_station_central_$(date +%Y%m%d_%H%M%S).sql.gz"
```

**Daily full backup — every tenant database** (loop over every row in the central `tenants` table's `code` column):

```bash
for code in $(mysql -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" -N -B -e "SELECT code FROM adaptive_station.tenants"); do
  mysqldump \
    --single-transaction --routines --triggers \
    -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" \
    "adaptive_station_${code}" | gzip > "adaptive_station_${code}_$(date +%Y%m%d_%H%M%S).sql.gz"
done
```

- `--single-transaction` avoids locking tables on InnoDB (all Adaptive Station tables are InnoDB per the DB design).
- Store backups off the application server (object storage or a separate backup host) — a backup that lives only on the machine it protects doesn't survive that machine's failure.
- Retain at minimum: 7 daily, 4 weekly, and 3 monthly backups, or per the school's/tenant's actual data-retention agreement. A new tenant database means a new backup target automatically appears in the next scheduled run of the loop above — no manual step needed when onboarding a school.

## 2. MySQL Restore

Restore procedure (verify against a staging database first, never restore directly into production without a rehearsal). Restoring a **single tenant** (the common case — one school's database is corrupted or a bad import needs rolling back) only requires that tenant's own backup file, not the central database:

```bash
# Central database (only if the central database itself needs restoring — rare):
gunzip -c adaptive_station_central_20260901_020000.sql.gz | mysql \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" adaptive_station_restore_target

# One tenant's database:
mysql -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS adaptive_station_cnhs_restore_target"
gunzip -c adaptive_station_cnhs_20260901_020000.sql.gz | mysql \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" adaptive_station_cnhs_restore_target
```

**Restore test checklist** (run at least once per quarter, and required before go-live per IP-006's release gates):

- [ ] Restore into a separate, non-production database (or database name, for a tenant restore).
- [ ] `php artisan migrate:status` shows no pending central migrations; `php artisan tenants:migrate {code}` reports the tenant database up to date.
- [ ] Spot-check tenant isolation still holds: a restored tenant database contains only that tenant's `people`/`rfid_cards`/`tap_events` — there is no cross-tenant row to find by construction now (each tenant is a separate physical database), but confirm the central `station_credentials`/`station_activation_codes` rows for this tenant still resolve correctly against the restored data.
- [ ] Row counts for the tenant's `people`/`tap_events` roughly match the source at backup time.
- [ ] Document the actual restore duration — this becomes the RTO (recovery time objective) communicated to school stakeholders during an incident. A single-tenant restore should be materially faster than a full central restore, since it only touches one school's database.

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

This command deliberately never touches `tap_events`, `people`, `rfid_cards`, `import_batches`, or `import_exceptions` — those are durable records with tenant-specific or legal retention requirements, not an infra default. Run manually with `php artisan retention:prune` at any time to check current effect; it reports counts deleted per table on each run. Since `device_heartbeats`/`integration_runs` now live per-tenant, this command loops every tenant's own database — `audit_logs` stays a single query against the central database.

## 5. Per-Tenant Database Provisioning and Cutover

- `php artisan tenants:migrate {code?}` — runs the tenant-table migrations (`database/migrations/tenant/`) against one tenant's database, or every tenant's if no code is given. Used automatically by `Tenant::provision()`; run by hand after adding a new tenant-table migration, to roll it out to every existing tenant database.
- `php artisan tenants:backfill-databases {code?}` — one-time cutover tool: copies a tenant's rows that predate the per-tenant-database restructure out of the old shared central database and into its new physical database, verifying row counts on both sides. Source rows are never deleted automatically — clear the old central copies by hand only after confirming the backfill.
