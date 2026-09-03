# MVP Acceptance Scenarios and Reconciliation Rules — Approved

**Milestone:** 0 (IP-001), verified across Milestones 1–6
**Status:** Approved for MVP
**Sources:** `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §14; `ADAPTIVE_STATION_DATABASE_DESIGN.md` §7, §11; `IP-005`, `IP-006`

## Acceptance Scenarios

These are the MVP's approved end-to-end acceptance scenarios. Each maps to the milestone(s) responsible for satisfying it.

| # | Scenario | Verified in |
|---|---|---|
| 1 | A tenant administrator cannot view, edit, or export another school's people, cards, stations, or events. | IP-002 (authorization/tenant scoping), re-verified in IP-006 security review |
| 2 | A valid registered card produces immediate kiosk feedback and a local SQLite event even with no internet. | IP-003 |
| 3 | An offline kiosk later uploads all pending events; retrying an uploaded batch does not duplicate events. | IP-003 |
| 4 | A deactivated card reaches the kiosk through the master-data change feed and is rejected offline after sync. | IP-003, IP-004 |
| 5 | A station can be revoked, preventing future cloud sync without deleting its local event history. | IP-002, IP-003 |
| 6 | A school administrator can see station health, unsynced count, last contact, and recent synchronization failures. | IP-004 |
| 7 | A pilot school can import roster data from its existing system and, when enabled, receive exported attendance in the required legacy format. | IP-005 |

These scenarios are the baseline acceptance suite; they must all pass before Milestone 5/6 pilot sign-off (`IP-006` release gates).

## Reconciliation Rules for Legacy Import

Every import run (per [PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md](PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md) Phase C) must report these counts in `import_batches.summary`, per `ADAPTIVE_STATION_DATABASE_DESIGN.md` §7:

| Count | Meaning |
|---|---|
| **Source count** | Total rows read from the legacy source for this entity type (`studinfo`, `teacher`, `taphistory`, kiosk local `attendance`, RFID column values). |
| **Imported** | Rows successfully written to Adaptive Station as new records. |
| **Skipped-as-known** | Rows that matched an existing Adaptive Station record by stable source identity (`tenant_id`, `source_system`, `source_record_id`) and were correctly treated as already-imported, not re-inserted. |
| **Rejected** | Rows that failed validation (e.g. missing required mapping, invalid timestamp, unresolvable person reference) and were not imported. |
| **Manual-review** | Rows that matched ambiguously (e.g. fingerprint match with no stable source ID, per `ADAPTIVE_STATION_DATABASE_DESIGN.md` §7 matching order) and require a human decision before import; recorded as `import_exceptions`. |

**Invariant:** `Source count = Imported + Skipped-as-known + Rejected + Manual-review`. Any run where this does not hold is treated as a defect in the importer, not a data anomaly to ignore.

### Event Matching Order (for `taphistory` / kiosk-local `attendance` → `tap_events`)

Per `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` Addendum and `ADAPTIVE_STATION_DATABASE_DESIGN.md` §7, the importer matches events in this order and stops at the first match:

1. Existing legacy UUID / kiosk `unique_key`.
2. Existing `taphistory` primary key or other stable source ID.
3. A conservative event fingerprint: tenant + legacy station + person/card + occurrence time + IN/OUT state.
4. If none match unambiguously → manual-review queue. The importer must never silently merge or drop an unmatched or ambiguously-matched record.

## Reconciliation Sign-Off Condition

A tenant's legacy migration is approved for cutover only when:

- The invariant above holds for every imported entity type (people, cards, tap events).
- Every `import_exceptions` row for the tenant has `resolution ∈ {resolved, ignored}` with a recorded resolver — **zero rows may remain `open`** at sign-off.
- Legacy `taphistory`-derived attendance counts reconcile against Adaptive Station `tap_events` counts for the agreed historical sample period (see [PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md](PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md) Phase D/E), within a tolerance agreed with the school stakeholder — no unreconciled event loss is acceptable per `IP-006` release gates.
- If a one-way legacy attendance export is enabled (settled requirement — see [DATA_OWNERSHIP_AND_TENANT_MODEL.md](DATA_OWNERSHIP_AND_TENANT_MODEL.md)), exported record counts reconcile against the source `tap_events` count for the same period.
