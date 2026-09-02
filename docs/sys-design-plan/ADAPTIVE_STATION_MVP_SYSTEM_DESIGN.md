# Adaptive Station — MVP System Design Plan

## 1. Product Definition

**Adaptive Station** is a standalone, multi-tenant RFID attendance platform for schools. It retains the existing live Windows kiosk's reliable local-first tapping behaviour while separating the product from the School Management System (SMS) in which it was originally embedded.

Adaptive Station is a product in its own right. A school may connect its existing SMS for roster import and optional attendance export, but the kiosk must continue operating when that system, the internet, or the cloud service is unavailable.

### Product components

| Component | Purpose |
|---|---|
| Adaptive Station Kiosk | Windows RFID terminal that validates cards, records taps locally, and gives immediate feedback. |
| Adaptive Station Cloud | Laravel API, multi-tenant data store, sync service, integrations, and background jobs. |
| Adaptive Station Portal | Browser-based administration portal for platform staff and school administrators. |
| Adaptive Station Connect | Per-school connector configuration and jobs for importing SMS roster data and optionally exporting attendance. |

## 2. MVP Goal

Deliver a production-ready MVP that lets multiple schools independently use RFID kiosks to record student and staff attendance—even during internet outages—and manage their data from a shared web platform.

The MVP must:

- Persist every valid non-duplicate scan to the kiosk's SQLite database before any network operation.
- Sync events safely to a central, tenant-isolated MySQL database after connectivity returns.
- Support multiple registered stations per school.
- Let a school manage people, RFID cards, stations, and attendance reports in the portal.
- Allow a school to connect an existing SMS as an optional roster source.
- Preserve the existing live system during onboarding; migration must not require an immediate cutover.

## 3. Scope

### Included in the MVP

- Windows fullscreen RFID kiosk, using the current .NET 8 WPF codebase as the starting point.
- Keyboard-wedge RFID reader support.
- Offline local lookup, duplicate protection, IN/OUT determination, local audit trail, and retry queue.
- Laravel multi-tenant API and MySQL persistence.
- Inertia/React/Tailwind portal for platform and school administrators.
- Tenant, station, person, RFID-card, tap-event, and sync-status management.
- Batch event upload and versioned/cursor-based master-data download.
- Initial school-system integration using a configurable import/export connector or CSV onboarding import.
- Attendance reporting and CSV export.
- Basic device health and synchronization visibility.

### Explicitly deferred after MVP

- Native mobile apps.
- Biometric readers, payments, gate/door control, and visitor management.
- A universal connector for every school system.
- Full replacement of a school's School Management System.
- Advanced payroll, grading, or academic reporting.
- Sophisticated notification-provider routing. Existing SMS queue compatibility can be delivered per integration.
- Dedicated database per tenant. The MVP uses logical isolation in a shared MySQL database.

## 4. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Kiosk application | .NET 8 WPF, Windows x64 | RFID input, fullscreen kiosk UI, local validation, tap capture, offline operation. |
| Kiosk local storage | SQLite | Cached master data, immutable local events, sync state, settings, audit log. |
| Cloud backend | Laravel | API, authentication, multi-tenancy enforcement, business logic, integrations, reporting. |
| Web portal | Inertia.js, React, Tailwind CSS | Super-admin and school-admin operations UI. |
| Central database | MySQL 8 | Multi-tenant operational and reporting data. |
| Background work | Laravel queues; Redis preferred | Imports, exports, notification work, reports, and scheduled synchronization tasks. |
| API protocol | HTTPS + JSON | Kiosk-to-cloud and portal-to-backend communication. |

### Kiosk implementation decision

The existing WPF app remains the MVP device application. Rewriting the live kiosk in React, Electron, or another runtime is not part of this MVP; it would add risk without improving the local-first requirement. The kiosk is changed from direct MySQL access to the Adaptive Station HTTPS API.

## 5. Target Architecture

```text
               School administrator browser
                         |
                         v
        Inertia + React + Tailwind portal
                         |
                         v
  +--------------------------------------------+
  | Adaptive Station Cloud (Laravel)           |
  | API · tenancy · reporting · queues         |
  +--------------------------------------------+
        |                       |             
        v                       v
  MySQL multi-tenant      Adaptive Station Connect
  operational database    (per-school import/export jobs)
        ^                       |
        |                       v
        |                 Existing School Management System
        |
 HTTPS batch synchronization
        |
  +-------------------------------+
  | Adaptive Station Kiosk        |
  | .NET WPF + local SQLite       |
  | RFID reader · immediate UI    |
  +-------------------------------+
```

### Architectural principles

1. **Local-first tap path.** A valid scan is never dependent on a network request.
2. **Cloud API only.** Kiosks never receive direct MySQL credentials and never expose MySQL to the public internet.
3. **Immutable, idempotent events.** Each event has a device-generated UUID, so safe retries cannot create duplicates.
4. **Tenant isolation by design.** All school-owned records are scoped by `tenant_id`; authorization derives the tenant from the authenticated principal.
5. **Optional integration.** Existing school systems are integrations, not run-time dependencies of the kiosk.
6. **Clear data ownership.** One system owns each mutable data category to avoid uncontrolled two-way updates.

## 6. Data Ownership and School-System Integration

| Data category | Default system of record | Notes |
|---|---|---|
| School, kiosk stations, device credentials | Adaptive Station | Created and managed in Adaptive Station. |
| Student/staff profile, enrolment, grade/section, parent contacts | Existing SMS when connected | Imported into Adaptive Station as a local operational copy. Adaptive Station is the source only for schools not using an SMS connector. |
| RFID-card assignment | Configurable per school; one explicit owner | MVP recommendation: manage in Adaptive Station once onboarded. If imported from SMS, define a one-way import rule. |
| Tap events | Adaptive Station | Immutable event log; may be exported to the SMS. |
| Notifications | Adaptive Station or legacy SMS integration | Select one delivery owner per tenant. |

### Connector rules

- Prefer a documented school-system API.
- Where no API exists, use a restricted, read-only database account for roster imports and a narrowly scoped writer for optional attendance export.
- Store credentials encrypted at rest and never place them on a kiosk.
- Each integration profile belongs to exactly one tenant.
- Connector jobs run in Laravel queues and must be idempotent.
- Do not let both systems edit the same fields without a documented precedence rule.

### Live-system transition

1. Keep the live kiosk and legacy database flow operating.
2. Provision the tenant and import roster/card data into Adaptive Station.
3. Register a pilot kiosk and verify cloud sync in parallel.
4. If legacy reports must continue, enable a one-way Adaptive Station-to-legacy attendance export.
5. Repoint kiosks to Adaptive Station in staged school/station rollouts.
6. Retire legacy direct-table dependencies only after reconciliation is complete.

## 7. Multi-Tenant MySQL Design

The MVP uses a shared MySQL database and logical tenant isolation. Every table holding school-owned data has a non-null `tenant_id` and indexes begin with it where the workload is tenant-scoped.

### Core entities

| Table | Selected fields | Purpose |
|---|---|---|
| `tenants` | `id`, `name`, `status`, `timezone` | A school/customer organization. |
| `users` | `id`, `tenant_id`, `name`, `email`, `password`, `role` | Portal users; platform users may have no tenant or use a platform role. |
| `stations` | `id`, `tenant_id`, `name`, `station_code`, `status`, `last_seen_at` | A registered kiosk terminal. |
| `station_credentials` | `id`, `station_id`, `token_hash`, `revoked_at`, `expires_at` | Rotatable device authentication credentials. |
| `people` | `id`, `tenant_id`, `external_id`, `person_type`, `name`, `is_active`, `metadata` | Student and staff operational records. |
| `rfid_cards` | `id`, `tenant_id`, `person_id`, `card_uid`, `is_active` | Card mapping and card lifecycle history. |
| `tap_events` | `id`, `tenant_id`, `station_id`, `person_id`, `card_uid`, `occurred_at`, `event_type`, `received_at` | Immutable attendance log. |
| `device_sync_cursors` | `station_id`, `master_data_version`, `last_pull_at`, `last_upload_at` | Device synchronization progress. |
| `master_data_changes` | `tenant_id`, `version`, `entity_type`, `entity_id`, `operation`, `changed_at` | Change feed for kiosk cache updates, including deactivations/deletions. |
| `integration_profiles` | `id`, `tenant_id`, `driver`, `config_encrypted`, `status` | Legacy school-system connection configuration. |
| `integration_runs` | `id`, `integration_profile_id`, `direction`, `status`, `started_at`, `finished_at`, `summary` | Connector auditability. |
| `audit_logs` | `id`, `tenant_id`, `actor_type`, `actor_id`, `action`, `metadata`, `created_at` | Administrative and integration audit records. |

### Key constraints and indexes

```sql
UNIQUE KEY uq_station_code_per_tenant (tenant_id, station_code);
UNIQUE KEY uq_card_uid_per_tenant (tenant_id, card_uid);
UNIQUE KEY uq_person_external_id_per_tenant (tenant_id, external_id);
INDEX ix_tap_events_tenant_time (tenant_id, occurred_at);
INDEX ix_tap_events_tenant_card_time (tenant_id, card_uid, occurred_at);
INDEX ix_master_changes_tenant_version (tenant_id, version);
```

`tap_events.id` is the kiosk-generated UUID and globally unique. A repeated upload of the same UUID returns success without inserting a second event.

### Tenancy enforcement

- A portal user’s tenant is resolved from their authenticated account and role.
- A kiosk’s tenant is resolved from its authenticated station credential.
- The API ignores any client-supplied tenant ID that conflicts with the authenticated tenant.
- Laravel query scopes/policies must apply tenant filtering to every tenant-owned model and endpoint.
- Platform-level operations are separate, explicitly authorized routes.

## 8. Local SQLite Design

The kiosk keeps only the information needed for its school and offline operation.

| Local table | Purpose |
|---|---|
| `people_cache` | Active and recently deactivated students/staff needed for card lookup and scan display. |
| `rfid_cards_cache` | Card UID to person mapping and active status. |
| `tap_events` | Locally created immutable taps awaiting or completing sync. |
| `sync_state` | Device credential metadata, cache cursor/version, last successful sync. |
| `audit_log` | Local scan, validation, and operational events. |
| `setup` | Station and kiosk display configuration. |
| `notification_queue` | Retained only if notifications remain a kiosk-originated workflow in the MVP. |

Recommended event fields:

```text
id (UUID), station_id, card_uid, person_id, person_type,
occurred_at_local, timezone_offset, event_type, sync_status,
sync_attempts, last_sync_error, created_at
```

Use UTC as the cloud canonical time, while retaining the device-local offset or tenant timezone needed for school-day reporting.

## 9. Kiosk Tap and Sync Flows

### Tap path

```text
1. RFID scanner sends a card UID and Enter to the WPF kiosk.
2. Kiosk normalizes and validates the UID.
3. Kiosk looks up the UID in local SQLite card/person cache.
4. Kiosk applies duplicate protection (same card within the configured window).
5. Kiosk determines the next IN/OUT state from local attendance history.
6. Kiosk creates a UUID event and writes it transactionally to local SQLite as pending.
7. Kiosk immediately displays the result.
8. A background worker uploads pending events when the API is reachable.
```

The existing one-minute duplicate rule is a suitable MVP default and should be configurable per tenant later. A duplicate is logged and shown but creates no event.

### Event upload

```text
1. Kiosk selects a bounded batch of pending local events.
2. Kiosk calls the authenticated HTTPS batch-upload endpoint.
3. Laravel derives tenant and station from the device credential.
4. Laravel validates the batch, inserts new UUIDs, and treats known UUIDs as accepted retries.
5. API returns accepted event IDs and per-event failures.
6. Kiosk marks only accepted events as synced; failures remain pending with an error.
```

### Master-data download

```text
1. Kiosk sends its last applied master-data version/cursor.
2. API returns changes for the kiosk's tenant only, including upserts and deactivations.
3. Kiosk applies the batch transactionally to SQLite.
4. Kiosk stores the new cursor only after the transaction succeeds.
```

A change cursor is preferred over only `updated_at > timestamp`, because it avoids clock-skew and same-timestamp gaps and can represent deletions/deactivations explicitly.

### Sync cadence

- On startup: authenticate/recover session, then pull master data and upload pending events.
- Normal online operation: upload queue every 30 seconds; pull master changes every five minutes.
- After a failed request: exponential backoff with a maximum interval, while keeping the normal local tap path responsive.
- Manual Sync action in kiosk admin mode: immediate push/pull attempt and visible result.

## 10. API Surface for MVP

All device endpoints require station authentication and use HTTPS.

| Method and endpoint | Purpose |
|---|---|
| `POST /api/v1/device/session` | Exchange station bootstrap credential for a short-lived access token. |
| `POST /api/v1/device/events/batch` | Idempotently accept pending tap events. |
| `GET /api/v1/device/master-data?cursor={cursor}` | Return a tenant-scoped incremental change feed. |
| `POST /api/v1/device/heartbeat` | Record device version, status, local queue count, and last scan time. |
| `GET /api/v1/device/config` | Fetch station-specific operational/display configuration. |

Portal APIs/routes are provided through Laravel/Inertia for tenant administration, reporting, station management, user management, card assignment, and integration configuration.

## 11. Security and Reliability Requirements

### Security

- HTTPS is mandatory for all cloud traffic.
- Store only hashed device tokens; support rotation and revocation.
- Encrypt integration credentials at rest using Laravel’s encryption facilities and restrict their display.
- Use Laravel authorization policies and tenant scopes for every tenant-owned resource.
- Do not distribute MySQL credentials to kiosk machines.
- Replace the current default `admin/admin123` account before deployment; require a password change during first-run provisioning.
- Maintain audit logs for logins, station registration, role changes, card changes, integration runs, and administrative changes.

### Reliability

- SQLite write completes before remote upload begins.
- Sync operations must be retry-safe and idempotent.
- Keep per-event errors and retry counts; do not silently discard failed events.
- Use database transactions for local event creation, cloud event insertion, and cache-change application.
- Report station last-seen time, current online/offline status, local pending count, app version, and last successful sync.
- Back up MySQL and provide a documented local SQLite recovery/export procedure.

## 12. MVP Portal Roles

| Role | Access |
|---|---|
| Platform super admin | Manage tenants, support stations, view platform health, and provision integrations. |
| Tenant/school admin | Manage school people/cards, stations, users, reports, display policies, and its own integrations. |
| Tenant operator | View attendance and reports; limited operational actions. |
| Kiosk station | API-only identity restricted to its single tenant and station. |

## 13. MVP Milestones

### Milestone 0 — Product and migration foundation

**Outcome:** the current product behaviour and legacy dependencies are documented, and the team can safely build alongside the live system.

- Confirm tenant boundaries, school timezone policy, and attendance semantics.
- Inventory current WPF local schema and all dependencies on `studinfo`, `teacher`, `gradelevel`, `taphistory`, and `tapbunker`.
- Define the canonical cloud event model and field mapping from legacy attendance.
- Select the first pilot school and document its roster/card source and report requirements.
- Establish repository structure, environments, backups, logging, and deployment baseline.

**Exit criteria:** approved data-ownership matrix, integration mapping, MVP acceptance scenarios, and pilot migration checklist.

### Milestone 1 — Laravel multi-tenant foundation

**Outcome:** a secure cloud core supports isolated schools and administrators.

- Create Laravel project, MySQL migrations, tenant-aware models, policies, and roles.
- Implement tenant, user, station, station-credential, person, card, and tap-event tables.
- Build tenant-scoped portal shell with Inertia, React, and Tailwind.
- Implement tenant and station provisioning, authentication, and audit logging.
- Add automated tests proving one tenant cannot access another tenant’s data.

**Exit criteria:** platform administrator can create a tenant and school administrator; school admin can manage only its own initial people/cards/stations.

### Milestone 2 — Device API and local-first synchronization

**Outcome:** an Adaptive Station kiosk can work offline and synchronize safely with the cloud.

- Implement device session, event batch upload, master-data cursor, heartbeat, and configuration endpoints.
- Add idempotent event insertion keyed by kiosk-generated UUID.
- Implement `master_data_changes` generation for people/card changes and deactivations.
- Update the WPF kiosk to authenticate to Laravel and remove direct remote MySQL reads/writes.
- Preserve SQLite-first persistence, duplicate protection, IN/OUT logic, pending queue, and background retry.
- Add sync telemetry to the portal.

**Exit criteria:** a kiosk records taps while offline, resumes connectivity, syncs each event exactly once logically, and displays accurate queue/health status.

### Milestone 3 — School administration and reporting

**Outcome:** a school can operate Adaptive Station without database access.

- Portal CRUD for people, RFID cards, station configuration, and tenant users.
- Attendance views filtered by date, person, card, event type, and station.
- CSV export and basic daily attendance summary.
- Station health page: last seen, app version, pending count, last sync, and recent errors.
- Support lookup/display data required by the kiosk such as name, person type, photo reference, grade/section.

**Exit criteria:** a school admin can onboard people/cards, register a station, find events, and export a daily report through the portal.

### Milestone 4 — Existing School Management System connectivity

**Outcome:** the standalone product can be deployed to a school without breaking its existing SMS workflow.

- Implement an initial connector driver for the pilot school (API preferred; otherwise restricted database integration).
- Import roster, staff, relevant contacts, grade/section, and RFID mappings into Adaptive Station.
- Implement optional one-way attendance export from Adaptive Station to the legacy format.
- Queue connector work, log every run, provide retry/error visibility, and reconcile counts.
- Document field ownership and conflict handling for the pilot profile.

**Exit criteria:** pilot-school roster updates reach kiosk caches; optional legacy attendance export reconciles with Adaptive Station event counts.

### Milestone 5 — Pilot hardening and production release

**Outcome:** Adaptive Station is ready for controlled live operation with the first school.

- Test extended offline operation, intermittent connectivity, duplicated upload retries, device-token rotation, and master-data deactivation.
- Complete role/tenant authorization, security, backup/restore, observability, and disaster-recovery checks.
- Run parallel validation against legacy reporting for an agreed period.
- Train school administrators and provide kiosk setup/support documentation.
- Roll out by station, monitor sync health, and formally complete reconciliation.

**Exit criteria:** pilot acceptance sign-off; no unreconciled event loss; operational support runbook in place.

## 14. MVP Acceptance Scenarios

1. A tenant administrator cannot view, edit, or export another school’s people, cards, stations, or events.
2. A valid registered card produces immediate kiosk feedback and a local SQLite event even with no internet.
3. An offline kiosk later uploads all pending events; retrying an uploaded batch does not duplicate events.
4. A deactivated card reaches the kiosk through the master-data change feed and is rejected offline after sync.
5. A station can be revoked, preventing future cloud sync without deleting its local event history.
6. A school administrator can see station health, unsynced count, last contact, and recent synchronization failures.
7. A pilot school can import roster data from its existing system and, when enabled, receive exported attendance in the required legacy format.

## Highlighted Addendum — Legacy Tapping-System Migration

> **MVP requirement:** tenant provisioning must support importing an existing school's live tapping data. This is separate from ongoing School Management System connectivity: it safely brings historical records and active kiosk data into Adaptive Station before or during the school's staged cutover.

### Migration workflow

1. A platform super admin creates the school tenant, its administrator accounts, policies, and initial station records.
2. The admin creates a tenant-scoped **Import Legacy Tapping Data** job and selects the available source: legacy MySQL, exported data, and/or existing kiosk `local.db` files.
3. The importer maps and previews people, RFID cards, attendance events, stations, and optional display configuration before committing any data.
4. The system validates required mappings, normalizes card IDs and timestamps, identifies duplicates, and reports invalid or ambiguous rows for review.
5. The importer writes data in batches, records an import audit trail, and produces source-versus-destination reconciliation totals.
6. Each kiosk is activated as an Adaptive Station station, downloads the tenant's cache, and uploads any remaining local pending events using the normal idempotent event API.
7. Where required, Adaptive Station exports newly recorded attendance back to the legacy School Management System during a defined parallel-run transition period.
8. Cutover is approved only after attendance counts and unresolved exceptions have been reconciled.

### Source-to-destination mapping

| Existing-system data | Adaptive Station destination | Migration rule |
|---|---|---|
| `studinfo` and `teacher` | `people` | Preserve the legacy ID as `external_id`; retain person type, active status, and required display/contact information. |
| Existing RFID columns | `rfid_cards` | Normalize the UID and map it to the imported person inside the tenant. |
| `taphistory` | `tap_events` | Preserve original occurrence time, IN/OUT state, card/person reference, and legacy station identifier when available. |
| Existing kiosk SQLite `attendance` rows | `tap_events` | Import unsynced and historical local rows only after duplicate evaluation against legacy/cloud records. |
| Legacy kiosk/station IDs | `stations` | Create an Adaptive Station station; retain old ID in metadata for traceability. |
| `tapbunker` SMS jobs/history | Archive by default | Import only when the school needs outstanding notification work to remain active. |

### Idempotency and traceability

Imported records must retain enough source identity to make a repeated import safe:

```text
source_system       = legacy_tapping
source_record_id    = legacy unique_key, taphistory ID, or equivalent stable identifier
import_batch_id     = migration execution identifier
```

For imported event records, enforce a tenant-scoped uniqueness rule such as:

```sql
UNIQUE KEY uq_imported_event_source
  (tenant_id, source_system, source_record_id);
```

The importer matches events in this order:

1. Existing legacy UUID/`unique_key`.
2. Existing remote `taphistory` primary key or stable source ID.
3. A conservative event fingerprint: tenant, legacy station, person/card, occurrence time, and IN/OUT state.
4. Manual-review queue when the fallback match is ambiguous.

The importer must never silently duplicate attendance or discard unmatched records. It must report imported, skipped-as-known, rejected, and manual-review counts to the platform administrator.

## 15. Post-MVP Direction

After the MVP is stable, expand deliberately rather than coupling new capabilities to the core tap path:

- Notification provider abstraction and delivery tracking.
- Additional SMS/API connector drivers and self-service mapping tools.
- Dedicated tenant database option for enterprise customers.
- Door/gate access-control integrations.
- Visitor management, events, payment/check-in, and mobile companion apps.
- Advanced attendance rules, schedules, late/early policies, and analytics.
- Managed kiosk updates and remote configuration rollout.

## 16. Definition of Success

Adaptive Station succeeds as an MVP when a new school can be provisioned as an isolated tenant, receive its roster and cards, operate one or more RFID kiosks without internet, synchronize reliably once online, manage attendance through the web portal, and continue using its existing School Management System where needed—all without granting kiosks direct access to a central MySQL database.
