# Support and Incident Runbook

**Milestone:** 5 (IP-006 work items 1, 8)
**Status:** Ready to execute — escalation contacts are placeholders until a real pilot is engaged

## On-Call / Escalation Contacts

| Role | Contact | Notes |
|---|---|---|
| Platform on-call engineer | `[TBD — fill in before go-live]` | First responder for `/api/health` failures, Slack alert-channel pages |
| Platform support lead | `[TBD]` | Escalation if on-call can't resolve within the incident's severity SLA |
| Pilot school point of contact | `[TBD — per pilot]` | For incidents affecting only that school's stations/data |

## Severity Levels

- **Sev1 — platform down or multi-tenant data at risk.** Page on-call immediately.
- **Sev2 — single tenant/station impaired** (a school can't sync, a station is offline). Respond within the agreed business-hours SLA.
- **Sev3 — cosmetic or non-blocking.** Track as a normal defect, no page.

## Incident Playbooks

### A device token may be compromised

1. Identify the affected station in the portal (`portal/stations/{station}`).
2. Issue a new credential (`StationCredential::issueFor` via the "Issue New Credential" button) — the new token is shown once.
3. Revoke the old credential (`StationCredential::revoke` via "Revoke") — takes effect immediately; `AuthenticateStationMiddlewareTest::test_revoked_credential_is_rejected` proves the kiosk is rejected on its very next request.
4. Update the physical kiosk with the new token per its own configuration procedure.
5. Record the incident (what happened, when the token was issued, why it's suspected compromised) — this is separate from the automatic `station_credential.revoked` audit log, which only records the action, not the reason.

### A tenant reports missing or incorrect attendance counts

1. Use the portal's daily attendance summary (`portal/attendance/summary`) to identify the affected date range.
2. Check station health (`portal/stations/{station}`) for that period — was the station offline or reporting a high pending count?
3. If a legacy integration is active for this tenant, check `portal/imports` for any `completed_with_exceptions` batches or open `import_exceptions` in that date range.
4. If reconciling against the legacy system, use the export tool (`portal/integrations/{profile}/edit` → "Run Attendance Export") to compare Adaptive Station's counts against the legacy `taphistory` table for the same period, per `ACCEPTANCE_SCENARIOS_AND_RECONCILIATION.md`'s reconciliation rules.
5. `tap_events` is immutable and append-only — a genuine data-entry mistake is corrected with a new event, never an edit to history. If the root cause is a station clock/timezone misconfiguration, fix the station's config going forward and document the affected historical range rather than silently rewriting it.

### A station won't sync

1. Check `portal/stations/{station}` for last-seen time, pending event count, and status.
2. If status is `disabled`/`retired`, that station's kiosk is being rejected by design (`AuthenticateStationMiddlewareTest::test_a_non_active_station_is_rejected_with_403`) — confirm this was intentional before re-activating.
3. If status is `active` but `last_seen_at` is stale, this is a network/kiosk-side issue outside this repository — follow the kiosk application's own troubleshooting guide; per `BACKUP_AND_RESTORE_RUNBOOK.md` §3, back up the kiosk's local SQLite before any reset if it may hold unsynced events.
4. Once connectivity is restored, confirm the kiosk's pending count drains to zero and no new `import_exceptions`-style issue appears (there is no automatic exception queue for live device sync — a persistent problem shows up as a station stuck with a non-zero pending count).

### An integration profile's legacy credentials need rotating

1. Edit the profile (`portal/integrations/{profile}/edit`).
2. Paste replacement JSON into the config field — the previous config is never redisplayed (write-only, per the shown-once-secret convention) and is fully overwritten on save (`IntegrationProfile::updateConfig`).
3. Trigger a small test import in preview mode (`commit=false`) to confirm the new credentials work before relying on them for a real import/export run.

## Weekly/Monthly Support Checklist

- [ ] `/api/health` has had no unexpected `503` in the alert channel this week.
- [ ] No `import_exceptions` have sat `open` for longer than an agreed SLA (e.g. 5 business days) across any active tenant.
- [ ] `queue:prune-failed`/`retention:prune` scheduled runs are executing (check `php artisan schedule:list` and recent logs) — a silently-broken scheduler wouldn't page anyone by itself.
- [ ] Backup job has completed successfully every day this week (`BACKUP_AND_RESTORE_RUNBOOK.md`).
