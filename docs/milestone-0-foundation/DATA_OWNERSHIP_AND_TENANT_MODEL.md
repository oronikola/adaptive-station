# Data Ownership and Tenant Model — Approved for MVP

**Milestone:** 0 (IP-001)
**Status:** Approved for MVP, pending pilot-specific historical-import scope (see "Open Decision" below)
**Depends on:** [ADR-001](../adr/ADR-001_shared-database-tenant-model.md)

## Tenant Model

- Adaptive Station uses a single shared MySQL 8 database with logical tenant isolation (see [ADR-001](../adr/ADR-001_shared-database-tenant-model.md)). A dedicated database per tenant is explicitly out of scope for the MVP.
- Every tenant-owned table carries a non-null `tenant_id`. A portal user's tenant is resolved from their authenticated account and role; a kiosk's tenant is resolved from its authenticated station credential. Neither is ever trusted from a client-supplied request parameter.
- Platform-level users (`platform_super_admin`) have no tenant and operate through explicitly separate, authorized routes.
- One integration profile belongs to exactly one tenant; one station belongs to exactly one tenant and is not reassigned across tenants without an audited support operation (IP-002).

## Data Ownership Matrix (Approved)

| Data category | System of record | Status | Notes |
|---|---|---|---|
| School, kiosk stations, device credentials | Adaptive Station | **Settled** | Created and managed exclusively in Adaptive Station; never sourced from a legacy or SMS system. |
| Student/staff profile, enrolment, grade/section, parent contacts | Existing SMS when connected; otherwise Adaptive Station | **Settled (default)** | Imported into Adaptive Station as a local operational copy per tenant. For the pilot template, assume no SMS connector is active at Milestone 0/1 time — Adaptive Station is the interim source of record until an SMS connector (Milestone 4 / IP-005) is enabled. |
| RFID-card assignment | **Adaptive Station** | **Settled** | Confirmed MVP decision: Adaptive Station owns card assignment once a school is onboarded. Any legacy or SMS-sourced card data is imported once via a one-way rule (see [LEGACY_FIELD_MAPPING.md](LEGACY_FIELD_MAPPING.md)); after import, edits happen only in Adaptive Station. |
| Tap events | Adaptive Station | **Settled** | Immutable event log. May be exported to a legacy system per the export decision below, but is never edited by an external system. |
| Notifications (SMS) | **Adaptive Station** | **Settled** | Confirmed MVP decision: the legacy SMS/notification queue (`tapbunker`) is **archived, not kept running**, during the pilot transition. Adaptive Station's own notification workflow (if enabled for the pilot) is the single delivery owner. See [LEGACY_FIELD_MAPPING.md](LEGACY_FIELD_MAPPING.md) for the `tapbunker` archival rule. |
| Legacy attendance reporting continuity | One-way export: Adaptive Station → legacy format | **Settled** | Confirmed MVP decision: a one-way Adaptive-Station-to-legacy attendance export **is required** during the pilot's parallel-run transition period, so existing legacy reports keep working until cutover is approved. Field mapping for the export is defined per integration profile in Milestone 4 (IP-005); it must reconcile against Adaptive Station's own event counts before cutover. |

## Open Decision

- **Historical attendance import period** — how far back historical `taphistory` (and any outstanding kiosk local-SQLite) records must be imported for the pilot school is **not yet determined**: `[TBD — requires a named pilot school and its reporting/retention requirements]`. This must be settled before Milestone 4 (IP-005) import work begins; it does not block Milestone 1–3 implementation.

## How This Feeds Later Milestones

- IP-002 implements the tenant/station/credential model exactly as scoped here — no per-tenant database provisioning step.
- IP-004 must ensure RFID-card management UI enforces Adaptive-Station-as-owner (no external system can push conflicting card edits into a tenant that has completed onboarding).
- IP-005 must build the one-way legacy export (not bidirectional) and must not build legacy SMS/`tapbunker` write support, per the settled decisions above.
