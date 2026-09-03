# Security and Resilience Test Evidence

**Milestone:** 5 (IP-006 work items 2, 3)
**Status:** Current as of 140 passing automated tests (`php artisan test`)
**Sources:** `docs/implementation-plans/IP-006_2026-09-02.md` (release gates), full `tests/Feature/` suite

This is IP-006's "security review" and "resilience testing" deliverable in report form. Most of the underlying mechanisms were already built and proven by IP-002–IP-005's own test suites; this document maps each release-gate requirement to the specific test(s) that prove it, and calls out the two real gaps closed in this pass. It does **not** substitute for a live field trial — items that genuinely require real hardware/network conditions are marked as such below.

## Release Gate 1 — "No unresolved critical security or tenant-isolation defect"

| Area | Proven by | Notes |
|---|---|---|
| Cross-tenant data access (Person, RfidCard, TapEvent, MasterDataChange) | `tests/Feature/TenantIsolation/{PersonCrossTenantTest,RfidCardCrossTenantTest,TapEventCardResolutionCrossTenantTest,MasterDataChangeCrossTenantTest}.php` | Fail-closed `TenantScope` — no tenant context means zero rows, not all rows |
| Global scope fail-closed behavior | `TenantIsolation/TenantGlobalScopeTest.php` | |
| Station route-model binding under tenant scope | `TenantIsolation/StationRouteModelBindingTest.php` | |
| Cross-tenant integration profiles/imports/exceptions | `Integrations/IntegrationTenantIsolationTest.php` | Includes tenant_operator getting 403 on all integration/import routes |
| Platform vs tenant role separation | `TenantIsolation/{PlatformAccessCrossRoleTest,PlatformAllTenantsAuditTest,UserPolicyCrossTenantTest,UserTenantRoleInvariantTest}.php` | |
| Station credential rotation/revocation | `TenantIsolation/StationCredentialCrossTenantTest.php`, `DeviceApi/AuthenticateStationMiddlewareTest::test_revoked_credential_is_rejected` and `test_an_expired_credential_is_rejected` | A revoked/expired credential is rejected immediately — no grace window |
| Activation code single-use | `TenantIsolation/StationActivationCodeSingleUseTest.php` | |
| Disabled/non-active station rejected at the device API boundary | `DeviceApi/AuthenticateStationMiddlewareTest::test_a_non_active_station_is_rejected_with_403` | A still-valid credential on a disabled station is still rejected — station `status` and credential validity are checked independently |
| Secret redaction (integration credentials never leak) | `Integrations/IntegrationProfileSecretRedactionTest.php` | Asserts `config_encrypted` absent from `toArray()`/`toJson()`/the actual Inertia edit-page response, and that the raw encrypted column doesn't contain the plaintext |
| Password-first-run controls | `Auth/*` (registration/reset/confirmation flows), `Portal/UserManagementTest::test_tenant_admin_can_invite_a_tenant_operator` (forced-reset redirect) | |
| Audit-log completeness | `Security/AuditLogCompletenessTest.php` **(new this pass)** | Exercises every fat-model mutation method once and asserts all 22 documented `audit_logs.action` values are recorded — closes a gap where no test previously proved every mutation is actually audited |

**Gap closed this pass:** audit-log completeness had no regression test before `Security/AuditLogCompletenessTest.php`.

## Release Gate 2 — "No confirmed loss of valid offline tap events in outage/recovery tests"

| Scenario | Proven by | Notes |
|---|---|---|
| Duplicate resubmission of an identical batch (kiosk retry after no server response) | `DeviceApi/TapEventBatchIdempotencyTest::test_resubmitting_an_identical_batch_produces_no_duplicate_rows` | Exact-UUID resubmit is a no-op, not a duplicate insert |
| Partial-batch validation (one malformed item doesn't sink valid siblings) | `DeviceApi/TapEventBatchPartialValidationTest::test_a_malformed_item_is_rejected_while_valid_siblings_still_succeed` | |
| Oversized batch envelope | `DeviceApi/TapEventBatchPartialValidationTest::test_an_oversized_batch_envelope_is_rejected_entirely` | Rejected as a whole (422), not silently truncated |
| Legacy import/export re-run after interruption | `Integrations/LegacyImportJobTest::test_rerunning_commit_import_is_idempotent`, `Integrations/LegacyExportJobTest::test_rerunning_export_over_the_same_range_produces_no_duplicate_rows` | |
| Queued job retry policy (app/worker restart while a job is pending) | `Resilience/QueuedImportExportJobRetryPolicyTest.php` **(new this pass)** | `RunLegacyImportJob`/`RunLegacyExportJob` now declare bounded `$tries=3` + backoff `[60,300,900]`s rather than relying on default (unbounded-looking) queue behavior; safety-under-retry itself is proved by the idempotency tests above |
| Reconciliation invariant (no event silently counted twice or dropped during import) | `Integrations/LegacyImportJobTest::test_reconciliation_invariant_holds`, ambiguous-match handling in `Integrations/LegacyImportAmbiguousMatchTest.php` | `source = imported + skipped_known + rejected + manual_review` holds by construction |
| Station health / sync visibility (last-seen, pending count) | `Portal/StationHealthTest.php` | |

**Gap closed this pass:** neither job previously declared a retry policy — `Resilience/QueuedImportExportJobRetryPolicyTest.php` now proves both do, and both are safe to retry per their existing idempotency tests.

**Not covered by automated tests (requires real hardware/network):** extended real-world offline operation (days without connectivity), genuine intermittent-network flakiness (as opposed to a synchronous retry in a test), and kiosk-application restart behavior — these live in the kiosk application itself, which is outside this repository, and can only be validated during the actual pilot's parallel-run period (`PILOT_CUTOVER_EXECUTION_RUNBOOK.md`).

## Other Release Gates

- **"Backup restore and local-kiosk recovery tests pass"** — procedure and checklist in `BACKUP_AND_RESTORE_RUNBOOK.md`; the restore-test checklist there must be executed against a real backup before go-live (not automatable as a PHPUnit test).
- **"Pilot roster/card/event imports reconcile within agreed tolerance; all exceptions have an owner"** — mechanism proven by `Integrations/Legacy*Test.php` and `docs/milestone-0-foundation/ACCEPTANCE_SCENARIOS_AND_RECONCILIATION.md`'s sign-off condition (zero `open` exceptions at cutover); actual pilot data hasn't been imported yet.
- **"School administrators can complete essential day-one workflows without database access"** — proven functionally by `Portal/DayOneWorkflowTest.php` end-to-end (create person → assign card → sync kiosk → tap → locate → export) plus `Portal/{PersonManagementTest,RfidCardManagementTest,StationManagementTest,UserManagementTest,AttendanceSearchTest,AttendanceSummaryTest,AttendanceExportTest}.php`; narrative walkthrough in `ADMIN_DAY_ONE_GUIDE.md`.
- **"Support runbook, monitoring ownership, and incident contacts are available"** — `SUPPORT_AND_INCIDENT_RUNBOOK.md`.

## How to Re-Run This Evidence

```bash
php artisan test
```

All 140 tests must pass with zero failures for this document's claims to hold. Re-generate/re-verify this table whenever a new test file is added under `tests/Feature/{TenantIsolation,DeviceApi,Security,Resilience,Integrations}/`.
