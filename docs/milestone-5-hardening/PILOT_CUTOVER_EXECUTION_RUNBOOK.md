# Pilot Cutover Execution Runbook

**Milestone:** 5 (IP-006 work items 5, 6, 7, 9)
**Status:** Ready to execute once a pilot school is selected — NOT yet performed
**Sources:** `docs/milestone-0-foundation/PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md` (the approved phase structure), IP-002–IP-005's actual built routes/commands

This runbook operationalizes `PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md`'s phases A–E into concrete steps using the features actually built, so execution doesn't require re-deriving "how do I do this" from the design docs when a real pilot begins. Nothing in this document has been executed — it requires a real pilot school, its legacy database access, and its staff availability, none of which exist in this repository.

## Before Starting

Fill in `PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md`'s "Pilot Facts" section first (school name, legacy deployment mode, historical import date range — the latter is an explicit open decision per `DATA_OWNERSHIP_AND_TENANT_MODEL.md` and must be settled with the school before Phase C).

## Phase A — Tenant and Access Setup

1. Platform super admin: **Platform → Tenants → New Tenant** (`Tenant::provision`), setting the school's actual timezone (default `Asia/Manila` unless the school specifies otherwise).
2. **Platform → Tenants → {tenant} → Create Admin** issues the first tenant_admin account (temp password shown once, forced reset on first login).
3. Platform super admin: **Platform → Stations → New Station** for each legacy kiosk being migrated, left at its default `pending_activation` status — do not activate yet.
4. Confirm with IT that no kiosk in this rollout will receive direct MySQL credentials (ADR-003) — this is enforced by construction (kiosks only ever call the device API), not a manual check, but worth confirming with the school's own IT staff who may be used to the legacy direct-DB model.

## Phase B — Import Preparation

1. As the tenant_admin: **Integrations → New Integration Profile**. Set `driver = legacy_mysql`, `direction` (import_only, or bidirectional if the export requirement applies — see Phase D), and paste the connection JSON (host/port/database/username/read-only credentials + table/column mapping — confirm the pilot's actual `studinfo`/`teacher` column names and RFID column alias first; see `LEGACY_FIELD_MAPPING.md` §1–3).
2. **Imports → New Import**, select the profile, leave the date range broad enough to cover the agreed historical window, click **Preview**. This performs zero writes — review the reconciliation counts (source/imported/skipped/rejected/manual-review) before proceeding.
3. If the preview's counts look wrong (e.g. unexpectedly high rejected/manual-review), fix the profile's column mapping and preview again — do not commit until the mapping looks correct.

## Phase C — Import Execution

1. **Imports → New Import** again with the same profile/date range, click **Commit**. This is safe to re-run if interrupted (`RunLegacyImportJob` is idempotent — re-running skips already-imported rows rather than duplicating them).
2. Review the completed batch's reconciliation counts (`portal/imports/{batch}`).
3. Resolve every entry under **Exceptions** — per `ACCEPTANCE_SCENARIOS_AND_RECONCILIATION.md`'s sign-off condition, zero may remain `open` at final cutover sign-off, though they may remain open during this phase while still under review.
4. Confirm `tapbunker` (the legacy SMS queue) was never referenced by this import — it's archived by design, not migrated (per `DATA_OWNERSHIP_AND_TENANT_MODEL.md`).

## Phase D — Station Activation and Parallel Run

1. Keep the legacy kiosk and legacy database flow running throughout Phases A–C — no disruption to current attendance capture yet.
2. Activate the first pilot kiosk as a real Adaptive Station station: **Stations → {station} → Issue Activation Code**, enter it on the kiosk (see `STATION_ACTIVATION_GUIDE.md`).
3. Confirm the kiosk downloads its full master-data cache and can record a test tap while genuinely offline (disconnect network briefly, tap a known card, reconnect, confirm the event syncs).
4. If the settled export requirement applies (per `DATA_OWNERSHIP_AND_TENANT_MODEL.md`, one-way export **is** required during transition): on the integration profile's page, **Run Attendance Export** for the current date range. Confirm the exported rows appear in the legacy `taphistory` table in the expected format.
5. Run Adaptive Station and the legacy flow in parallel for the agreed validation period. **Daily**: compare Adaptive Station's attendance summary (`portal/attendance/summary`) against the legacy system's own report for the same day; investigate any discrepancy before it compounds.

## Phase E — Staged Cutover

1. Repoint kiosks to Adaptive Station one station at a time, not all at once — confirm each newly cut-over station's sync health (last seen, pending count) on the Stations page before moving to the next.
2. Before final sign-off: confirm every `import_exceptions` row for this tenant has `resolution ∈ {resolved, ignored}` — zero `open` (query via **Imports → {batch} → Exceptions**, filter by "Open").
3. Retire the legacy system's direct-table dependencies for this school only after reconciliation is complete and stakeholders have explicitly signed off — this is a one-way step (see the checklist's own Rollback Plan).

## After Cutover

Fill in `POST_LAUNCH_REVIEW_TEMPLATE.md` once the staged cutover completes and the parallel-run period has closed.
