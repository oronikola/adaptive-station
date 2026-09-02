# Adaptive Station — Database Design

## 1. Purpose and Scope

This document defines the MVP data model for **Adaptive Station**, a standalone, multi-tenant RFID attendance platform. It covers:

- Central Laravel/MySQL operational data.
- Local SQLite data held by each Windows kiosk.
- Tenant isolation, authentication, synchronization, and auditability.
- Migration traceability for schools moving from the existing RFID tapping system.

The cloud database is the central system of record for Adaptive Station. A kiosk remains operationally authoritative for the local capture of a tap until that tap is accepted by the cloud API.

## 2. Database Conventions

| Concern | Decision |
|---|---|
| Cloud engine | MySQL 8.0+, InnoDB, `utf8mb4`, UTC database/session time. |
| Local engine | SQLite, one database per kiosk installation. |
| IDs | UUID v4 strings (`CHAR(36)` in MySQL, `TEXT` in SQLite). Kiosks generate tap-event IDs. |
| Tenant isolation | Every tenant-owned cloud table has non-null `tenant_id`; all application queries are tenant-scoped. |
| Time | Store instants in UTC using `DATETIME(3)`; retain `occurred_offset_minutes` for device-local interpretation. |
| Boolean | `TINYINT(1)` in MySQL; `INTEGER` (`0`/`1`) in SQLite. |
| JSON | MySQL `JSON`; SQLite `TEXT` containing validated JSON. Use only for optional/non-report-critical attributes. |
| Deletion | Prefer `is_active`, `deactivated_at`, or `deleted_at` over destructive deletion for operational records. |
| Schema changes | Laravel migrations are the sole source of truth for cloud-schema changes. Kiosk releases include SQLite migrations. |

### Naming

- Tables and columns use `snake_case`.
- Timestamps use `_at`; UTC instants use `*_at` or `occurred_at`.
- IDs are named `id`, with references named `{entity}_id`.
- `tenant_id` is always explicit rather than inferred through joins.

## 3. Cloud Logical Model

```text
tenants 1---* users
tenants 1---* stations 1---* station_credentials
tenants 1---* people 1---* rfid_cards
tenants 1---* tap_events *---1 stations
                         *---0..1 people
tenants 1---* master_data_changes
stations 1---1 device_sync_cursors
tenants 1---* integration_profiles 1---* integration_runs
tenants 1---* import_batches 1---* import_exceptions
tenants 1---* audit_logs
```

## 4. Cloud MySQL Schema

The following DDL is the intended MVP logical schema. Laravel migrations may add conventional fields such as `updated_at` or indexes needed by an implemented query plan.

### 4.1 Tenant and portal identity

```sql
CREATE TABLE tenants (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila',
    status ENUM('active', 'suspended', 'archived') NOT NULL DEFAULT 'active',
    attendance_policy JSON NULL,
    notification_policy JSON NULL,
    settings JSON NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_tenants_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('platform_super_admin', 'tenant_admin', 'tenant_operator') NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_users_email (email),
    INDEX ix_users_tenant_role (tenant_id, role),
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Rules:

- `platform_super_admin` users have `tenant_id = NULL`.
- Tenant roles must have a non-null `tenant_id`; enforce this with Laravel validation and, where desired, a MySQL check constraint.
- Portal authorization always derives the tenant from the authenticated user, never from a request parameter alone.

### 4.2 Stations and kiosk credentials

```sql
CREATE TABLE stations (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    station_code VARCHAR(50) NOT NULL,
    status ENUM('pending_activation', 'active', 'disabled', 'retired') NOT NULL DEFAULT 'pending_activation',
    app_version VARCHAR(50) NULL,
    last_seen_at DATETIME(3) NULL,
    last_scan_at DATETIME(3) NULL,
    last_pending_count INT UNSIGNED NULL,
    configuration JSON NULL,
    legacy_station_id VARCHAR(100) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_stations_tenant_code (tenant_id, station_code),
    INDEX ix_stations_tenant_status (tenant_id, status),
    CONSTRAINT fk_stations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE station_credentials (
    id CHAR(36) PRIMARY KEY,
    station_id CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    label VARCHAR(100) NULL,
    expires_at DATETIME(3) NULL,
    last_used_at DATETIME(3) NULL,
    revoked_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_station_credentials_token_hash (token_hash),
    INDEX ix_station_credentials_active (station_id, revoked_at, expires_at),
    CONSTRAINT fk_station_credentials_station FOREIGN KEY (station_id) REFERENCES stations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE station_activation_codes (
    id CHAR(36) PRIMARY KEY,
    station_id CHAR(36) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    consumed_at DATETIME(3) NULL,
    created_by_user_id CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_activation_codes_hash (code_hash),
    INDEX ix_activation_codes_station (station_id, consumed_at, expires_at),
    CONSTRAINT fk_activation_codes_station FOREIGN KEY (station_id) REFERENCES stations(id),
    CONSTRAINT fk_activation_codes_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Activation codes are one-time, short-lived secrets. The raw code is shown only at creation time; the database stores its hash. A successful activation creates a station credential and binds the kiosk to that station and tenant.

### 4.3 People and RFID cards

```sql
CREATE TABLE people (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    external_id VARCHAR(100) NULL,
    person_type ENUM('student', 'staff') NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    grade_level VARCHAR(100) NULL,
    section VARCHAR(100) NULL,
    photo_url VARCHAR(2048) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    deactivated_at DATETIME(3) NULL,
    metadata JSON NULL,
    source_system VARCHAR(50) NULL,
    source_record_id VARCHAR(100) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    deleted_at DATETIME(3) NULL,
    UNIQUE KEY uq_people_tenant_external_id (tenant_id, external_id),
    UNIQUE KEY uq_people_import_source (tenant_id, source_system, source_record_id),
    INDEX ix_people_tenant_active_type (tenant_id, is_active, person_type),
    INDEX ix_people_tenant_name (tenant_id, last_name, first_name),
    CONSTRAINT fk_people_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rfid_cards (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    person_id CHAR(36) NOT NULL,
    card_uid VARCHAR(100) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    assigned_at DATETIME(3) NOT NULL,
    deactivated_at DATETIME(3) NULL,
    source_system VARCHAR(50) NULL,
    source_record_id VARCHAR(100) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_rfid_cards_tenant_uid (tenant_id, card_uid),
    UNIQUE KEY uq_rfid_cards_import_source (tenant_id, source_system, source_record_id),
    INDEX ix_rfid_cards_tenant_person (tenant_id, person_id, is_active),
    CONSTRAINT fk_rfid_cards_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_rfid_cards_person FOREIGN KEY (person_id) REFERENCES people(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`card_uid` is normalized before persistence (trimmed, case-normalized according to scanner convention). A card UID is unique **within** a tenant, allowing different schools to reuse the same physical-card value without collision.

### 4.4 Immutable tap events

```sql
CREATE TABLE tap_events (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    station_id CHAR(36) NOT NULL,
    person_id CHAR(36) NULL,
    card_uid VARCHAR(100) NOT NULL,
    person_type ENUM('student', 'staff') NULL,
    event_type ENUM('IN', 'OUT') NOT NULL,
    occurred_at DATETIME(3) NOT NULL,
    occurred_offset_minutes SMALLINT NOT NULL,
    received_at DATETIME(3) NOT NULL,
    attendance_date_local DATE NOT NULL,
    source_system VARCHAR(50) NOT NULL DEFAULT 'adaptive_station',
    source_record_id VARCHAR(100) NULL,
    import_batch_id CHAR(36) NULL,
    metadata JSON NULL,
    created_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_tap_events_import_source (tenant_id, source_system, source_record_id),
    INDEX ix_tap_events_tenant_occurred (tenant_id, occurred_at),
    INDEX ix_tap_events_tenant_person_date (tenant_id, person_id, attendance_date_local),
    INDEX ix_tap_events_tenant_card_occurred (tenant_id, card_uid, occurred_at),
    INDEX ix_tap_events_station_occurred (station_id, occurred_at),
    CONSTRAINT fk_tap_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_tap_events_station FOREIGN KEY (station_id) REFERENCES stations(id),
    CONSTRAINT fk_tap_events_person FOREIGN KEY (person_id) REFERENCES people(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Notes:

- `id` is generated by the kiosk for new live events. Re-submitting it is a successful no-op.
- Tap events are append-only. Corrections are represented by a new adjustment event or an audited attendance-management feature added later; do not overwrite scan history.
- `attendance_date_local` is calculated using the tenant's timezone at acceptance/import time and supports fast daily-school reporting.
- Legacy imported records use `source_system = 'legacy_tapping'` plus a stable `source_record_id` where available.

### 4.5 Synchronization and master-data change feed

```sql
CREATE TABLE master_data_changes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    version BIGINT UNSIGNED NOT NULL,
    entity_type ENUM('person', 'rfid_card', 'tenant_config', 'station_config') NOT NULL,
    entity_id CHAR(36) NOT NULL,
    operation ENUM('upsert', 'deactivate', 'delete') NOT NULL,
    payload JSON NULL,
    changed_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_master_data_changes_tenant_version (tenant_id, version),
    INDEX ix_master_data_changes_tenant_version (tenant_id, version),
    CONSTRAINT fk_master_data_changes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE device_sync_cursors (
    station_id CHAR(36) PRIMARY KEY,
    master_data_version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    last_pull_at DATETIME(3) NULL,
    last_upload_at DATETIME(3) NULL,
    last_successful_sync_at DATETIME(3) NULL,
    updated_at DATETIME(3) NOT NULL,
    CONSTRAINT fk_device_sync_cursors_station FOREIGN KEY (station_id) REFERENCES stations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE device_heartbeats (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    station_id CHAR(36) NOT NULL,
    app_version VARCHAR(50) NULL,
    pending_event_count INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('online', 'degraded', 'offline_reported') NOT NULL DEFAULT 'online',
    reported_at DATETIME(3) NOT NULL,
    INDEX ix_device_heartbeats_station_reported (station_id, reported_at),
    CONSTRAINT fk_device_heartbeats_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_device_heartbeats_station FOREIGN KEY (station_id) REFERENCES stations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

The API delivers changes greater than the kiosk's `master_data_version`. The client records the newer version only after it commits the complete change batch to SQLite. This is safer than a plain `updated_at` timestamp comparison because it handles clock skew, ties, and deactivations.

### 4.6 Legacy integrations and import auditability

```sql
CREATE TABLE integration_profiles (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    driver VARCHAR(50) NOT NULL,
    direction ENUM('import_only', 'export_only', 'bidirectional') NOT NULL,
    status ENUM('active', 'disabled', 'error') NOT NULL DEFAULT 'disabled',
    config_encrypted TEXT NOT NULL,
    last_successful_run_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    INDEX ix_integration_profiles_tenant_status (tenant_id, status),
    CONSTRAINT fk_integration_profiles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE integration_runs (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    integration_profile_id CHAR(36) NOT NULL,
    direction ENUM('import', 'export') NOT NULL,
    status ENUM('queued', 'running', 'succeeded', 'failed', 'partial') NOT NULL,
    started_at DATETIME(3) NULL,
    finished_at DATETIME(3) NULL,
    summary JSON NULL,
    error_message TEXT NULL,
    created_at DATETIME(3) NOT NULL,
    INDEX ix_integration_runs_profile_created (integration_profile_id, created_at),
    CONSTRAINT fk_integration_runs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_integration_runs_profile FOREIGN KEY (integration_profile_id) REFERENCES integration_profiles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE import_batches (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    source_system VARCHAR(50) NOT NULL,
    source_description VARCHAR(255) NULL,
    status ENUM('draft', 'validating', 'importing', 'completed', 'completed_with_exceptions', 'failed') NOT NULL,
    started_at DATETIME(3) NULL,
    finished_at DATETIME(3) NULL,
    summary JSON NULL,
    created_by_user_id CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    INDEX ix_import_batches_tenant_created (tenant_id, created_at),
    CONSTRAINT fk_import_batches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_import_batches_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE import_exceptions (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    import_batch_id CHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    source_record_id VARCHAR(100) NULL,
    exception_type ENUM('validation_error', 'ambiguous_duplicate', 'missing_reference', 'unsupported_data') NOT NULL,
    payload JSON NULL,
    resolution ENUM('open', 'ignored', 'resolved') NOT NULL DEFAULT 'open',
    resolved_by_user_id CHAR(36) NULL,
    resolved_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    INDEX ix_import_exceptions_batch_resolution (import_batch_id, resolution),
    CONSTRAINT fk_import_exceptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_import_exceptions_batch FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`tap_events.import_batch_id` intentionally has no physical foreign key in this first design so events may survive an import-batch retention/archive procedure. Application validation must still ensure the batch belongs to the same tenant.

### 4.7 Audit log

```sql
CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NULL,
    actor_type ENUM('user', 'station', 'system') NOT NULL,
    actor_id CHAR(36) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NULL,
    entity_id CHAR(36) NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME(3) NOT NULL,
    INDEX ix_audit_logs_tenant_created (tenant_id, created_at),
    INDEX ix_audit_logs_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Examples: tenant provisioning, station activation, credential revocation, card assignment, administrator login, integration execution, migration exception resolution, and manual attendance adjustment.

## 5. Local Kiosk SQLite Schema

Each kiosk has one local SQLite database. It contains only its assigned tenant's cache and its own operational history. It never contains central MySQL or legacy-SMS credentials.

```sql
CREATE TABLE local_identity (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    tenant_id TEXT NOT NULL,
    station_id TEXT NOT NULL,
    credential_reference TEXT NOT NULL,
    activated_at TEXT NOT NULL
);

CREATE TABLE people_cache (
    id TEXT PRIMARY KEY,
    external_id TEXT NULL,
    person_type TEXT NOT NULL CHECK (person_type IN ('student', 'staff')),
    display_name TEXT NOT NULL,
    grade_level TEXT NULL,
    section TEXT NULL,
    photo_url TEXT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE rfid_cards_cache (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    card_uid TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES people_cache(id)
);

CREATE TABLE tap_events (
    id TEXT PRIMARY KEY,
    station_id TEXT NOT NULL,
    person_id TEXT NULL,
    card_uid TEXT NOT NULL,
    person_type TEXT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('IN', 'OUT')),
    occurred_at_utc TEXT NOT NULL,
    occurred_offset_minutes INTEGER NOT NULL,
    attendance_date_local TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (sync_status IN ('pending', 'synced', 'rejected')),
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    last_sync_attempt_at TEXT NULL,
    last_sync_error TEXT NULL,
    remote_received_at TEXT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES people_cache(id)
);

CREATE TABLE sync_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    card_uid TEXT NULL,
    details TEXT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE setup (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX ix_local_tap_events_sync_status
    ON tap_events (sync_status, occurred_at_utc);
CREATE INDEX ix_local_tap_events_person_day
    ON tap_events (person_id, attendance_date_local, occurred_at_utc);
CREATE INDEX ix_local_tap_events_card_time
    ON tap_events (card_uid, occurred_at_utc);
```

`sync_state` contains at minimum:

```text
master_data_version
last_successful_sync_at
last_upload_at
last_pull_at
```

The device access token should be protected by Windows DPAPI/Credential Manager or equivalent OS-level protection. Do not keep a raw long-lived token in a plain SQLite value.

## 6. Synchronization Data Rules

### Event upload

1. The kiosk creates the UUID and inserts the event into local SQLite with `sync_status = 'pending'` in the same transaction as its local attendance update.
2. It sends a bounded batch to the API.
3. The API authenticates the station, derives its tenant, verifies it is active, and validates every event.
4. For an unknown event UUID, the API inserts a `tap_events` row with `received_at = UTC now`.
5. For an existing UUID belonging to the same tenant/station, the API returns it as accepted without another insert.
6. The kiosk marks only accepted IDs as `synced`.
7. Rejected events remain recorded locally with the error until an authorized operator resolves them.

### Master-data pull

1. Laravel creates a `master_data_changes` record whenever a person, card, tenant policy, or station configuration changes.
2. The kiosk requests changes after its current version.
3. The kiosk applies all changes in one SQLite transaction.
4. Only after commit does it advance `master_data_version`.
5. Deactivation is a first-class change: a deactivated card/person remains in the local cache but becomes invalid for new taps.

### Offline IN/OUT and duplicate rules

- The kiosk determines IN/OUT using its local event history for the tenant-local school day.
- The default duplicate window is one minute for the same card; it is evaluated locally and logs a duplicate without creating a tap event.
- Cloud reporting uses the recorded event state. It does not recompute history during normal sync, avoiding changes caused by late-arriving offline events.

## 7. Legacy Migration Rules

### Source mappings

| Legacy source | Destination | Stable import identity |
|---|---|---|
| `studinfo` | `people` | tenant + `legacy_tapping` + student ID |
| `teacher` | `people` | tenant + `legacy_tapping` + teacher ID |
| RFID column/cache | `rfid_cards` | tenant + `legacy_tapping` + card record ID; otherwise tenant + normalized UID |
| `taphistory` | `tap_events` | tenant + `legacy_tapping` + legacy attendance/unique key |
| Kiosk local SQLite attendance | `tap_events` | kiosk `unique_key`/UUID if present |

### Import safeguards

- Validate and preview before writing.
- Preserve the source’s original tap time and IN/OUT state.
- Prefer a source UUID or source primary key. Use a conservative event fingerprint only when no stable source ID exists.
- If an event matches ambiguously, create `import_exceptions`; do not silently merge or drop it.
- Record imported, skipped-known, rejected, and manual-review totals in `import_batches.summary`.
- Run reconciliation against legacy `taphistory` and kiosk local queue counts before cutover.

## 8. Tenant-Isolation Requirements

MySQL foreign keys provide referential integrity, not tenant security. Tenant isolation is enforced by the Laravel application and tested explicitly.

- Every portal query filters by the authenticated user’s `tenant_id`, unless using an explicitly authorized platform route.
- Every station endpoint derives `tenant_id` from `station_credentials -> stations`; it does not trust a tenant ID supplied by the kiosk.
- Mutating requests verify referenced station, person, card, integration profile, and import batch belong to that same tenant.
- Background jobs always carry a tenant context and assert it before processing.
- Integration secrets are readable only by authorized server-side jobs, never portal clients or kiosks.

## 9. Data Retention and Operations

- Keep `tap_events` as a durable attendance record; define school-specific retention only after legal/business review.
- Archive old `device_heartbeats`, `audit_logs`, and completed `integration_runs` according to an operational retention policy.
- Back up MySQL regularly and test restore procedures.
- Kiosk support procedures must export/backup SQLite before a reset, hardware replacement, or major troubleshooting action.
- Database migrations require a tested rollback/forward recovery plan and maintenance communication when needed.

## 10. MVP Schema Implementation Order

1. `tenants`, `users`, `stations`, `station_credentials`, and activation codes.
2. `people`, `rfid_cards`, and tenant-aware portal CRUD.
3. `tap_events`, event-upload API, indexes, and idempotency tests.
4. `master_data_changes`, device cursor, heartbeat, and local-cache API.
5. SQLite schema/migrations and WPF API conversion.
6. Integration, import-batch, exception, and reconciliation tables.
7. Audit logs, reporting indexes, retention, monitoring, and production backup controls.

## 11. Acceptance Criteria

- The same card UID can exist in two different tenants but never twice as an active card within one tenant.
- A station credential can read/write only the tenant to which its station belongs.
- Uploading the same kiosk event UUID repeatedly produces one cloud event.
- A master-data deactivation reaches the kiosk and prevents new offline acceptance after synchronization.
- Imported legacy attendance is traceable to its source record and cannot be duplicated by a rerun.
- A tenant administrator cannot retrieve another tenant’s people, cards, events, integration data, or device health information.
- A kiosk can record events with no network and preserve them until a successful synchronized acknowledgment.
