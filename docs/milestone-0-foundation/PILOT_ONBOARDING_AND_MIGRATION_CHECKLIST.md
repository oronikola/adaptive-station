# Pilot Onboarding and Migration Checklist

**Milestone:** 0 (IP-001), executed during Milestones 4–5 (IP-005, IP-006)
**Status:** Template — pilot-specific facts are placeholders until a school is selected
**Sources:** `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §6 "Live-system transition" and the Migration Addendum; `ADAPTIVE_STATION_DATABASE_DESIGN.md` §7; [LEGACY_FIELD_MAPPING.md](LEGACY_FIELD_MAPPING.md); [DATA_OWNERSHIP_AND_TENANT_MODEL.md](DATA_OWNERSHIP_AND_TENANT_MODEL.md)

## Pilot Facts (fill in before starting Milestone 4)

- Pilot school name: `[Pilot School Name]`
- Legacy deployment mode: `[Direct Mode | Local + Cloud Mode]` (per `TECHNICAL_DOCUMENTATION.md` "Deployment Modes")
- Legacy schema sample obtained: `[ ] Yes  [ ] No — attach sanitized studinfo/teacher/gradelevel/taphistory/tapbunker samples`
- Historical attendance import range: `[TBD — see DATA_OWNERSHIP_AND_TENANT_MODEL.md open decision]`
- Number of active legacy kiosks/stations to migrate: `[N]`
- Existing SMS/notification continuation required: **No** (settled — see data-ownership doc)
- Legacy attendance export required during transition: **Yes** (settled — see data-ownership doc)

## Phase A — Tenant and Access Setup (before any data import)

- [ ] Platform super admin creates the tenant record (`tenants`), initial tenant admin account(s), and default policies.
- [ ] Platform super admin creates placeholder `stations` records for each legacy kiosk to be migrated, `status = pending_activation`.
- [ ] Confirm tenant timezone setting matches the pilot school's actual timezone (default `Asia/Manila` per `ADAPTIVE_STATION_DATABASE_DESIGN.md` §4.1 unless otherwise specified).
- [ ] Confirm no kiosk in this rollout will ever receive direct MySQL credentials ([ADR-003](../adr/ADR-003_api-only-kiosk-cloud-communication.md)).

## Phase B — Import Preparation

- [ ] Create a tenant-scoped **Import Legacy Tapping Data** job (`import_batches`) and select the available source: legacy MySQL, exported data dump, and/or kiosk `local.db` files.
- [ ] Confirm field mapping in [LEGACY_FIELD_MAPPING.md](LEGACY_FIELD_MAPPING.md) matches the pilot's actual schema; note any deviations as an addendum to that document rather than silently improvising during import.
- [ ] Confirm the detected RFID column alias for the pilot's `studinfo`/`teacher` tables (see mapping §3).
- [ ] Preview mapped people, RFID cards, attendance events, and stations before committing any data — no writes until preview is reviewed.
- [ ] Validate required mappings, normalize card UIDs and timestamps, and identify duplicates; unresolved/ambiguous rows go to `import_exceptions`, never silently merged or dropped.

## Phase C — Import Execution

- [ ] Import `studinfo` → `people` (students).
- [ ] Import `teacher` → `people` (staff).
- [ ] Import RFID column values → `rfid_cards`, one-way, scoped to this tenant.
- [ ] Import `taphistory` → `tap_events` for the agreed historical range.
- [ ] Import unsynced/historical kiosk local SQLite `attendance` rows → `tap_events`, after duplicate evaluation against already-imported `taphistory` records.
- [ ] Confirm `tapbunker` is **not** imported (archived by default per the settled notification decision).
- [ ] Record import audit trail and reconciliation totals in `import_batches.summary` (see [ACCEPTANCE_SCENARIOS_AND_RECONCILIATION.md](ACCEPTANCE_SCENARIOS_AND_RECONCILIATION.md) for the required counts).

## Phase D — Station Activation and Parallel Run

- [ ] Keep the live legacy kiosk and legacy database flow operating throughout Phases A–C — no disruption to current attendance capture.
- [ ] Activate the first pilot kiosk as an Adaptive Station station; confirm it downloads the tenant's cache and can record a test tap while offline.
- [ ] Upload any remaining local pending kiosk events through the normal idempotent event API; confirm zero duplicate `tap_events` rows result.
- [ ] Enable the one-way Adaptive-Station-to-legacy attendance export (settled requirement); confirm exported records match the pilot's expected legacy `taphistory` format.
- [ ] Run Adaptive Station and the legacy flow in parallel for an agreed validation period; reconcile attendance counts daily.

## Phase E — Staged Cutover

- [ ] Repoint kiosks to Adaptive Station in staged station-by-station rollout order (not all at once).
- [ ] Confirm sync health (last seen, pending count, last successful sync) for each newly cut-over station before proceeding to the next.
- [ ] Confirm all `import_exceptions` for this tenant are resolved or explicitly accepted with an owner before final cutover sign-off.
- [ ] Retire legacy direct-table dependencies for this school only after reconciliation is complete and stakeholders sign off.

## Rollback Plan

- [ ] While in Phases A–D, the legacy system remains the operational system of record — rollback is simply "stop using the pilot Adaptive Station kiosk/station" with no data loss, since legacy flow was never interrupted.
- [ ] After Phase E cutover begins, rollback for an individual station means re-enabling its legacy remote-DB configuration and disabling its Adaptive Station station credential; document the specific legacy connection settings needed for this school's rollback before cutover starts.
- [ ] Rollback is no longer available once legacy direct-table dependencies are formally retired (last checklist item in Phase E) — this step must not occur until stakeholders explicitly approve it.
