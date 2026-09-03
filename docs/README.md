# Adaptive Station Documentation

This folder contains the product, architecture, database, migration, and implementation documentation for **Adaptive Station**—the planned standalone, multi-tenant evolution of the existing RFID Tapping System.

Adaptive Station keeps the current kiosk's local-first RFID operation while introducing a Laravel-based cloud platform, tenant-isolated MySQL data, a web administration portal, and optional integrations with each school's existing School Management System.

## Documentation Structure

```text
docs/
├── README.md
├── master/
│   ├── SYSTEM_ARCHITECTURE.md
│   └── TECHNICAL_DOCUMENTATION.md
├── sys-design-plan/
│   ├── ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md
│   └── ADAPTIVE_STATION_DATABASE_DESIGN.md
├── implementation-plans/
│   ├── IP-001_2026-09-02.md
│   ├── IP-002_2026-09-02.md
│   ├── IP-003_2026-09-02.md
│   ├── IP-004_2026-09-02.md
│   ├── IP-005_2026-09-02.md
│   └── IP-006_2026-09-02.md
├── milestone-0-foundation/
│   ├── DATA_OWNERSHIP_AND_TENANT_MODEL.md
│   ├── LEGACY_FIELD_MAPPING.md
│   ├── PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md
│   ├── ACCEPTANCE_SCENARIOS_AND_RECONCILIATION.md
│   └── ENVIRONMENT_BASELINE.md
├── adr/
│   ├── ADR-001_shared-database-tenant-model.md
│   ├── ADR-002_retain-wpf-kiosk-for-mvp.md
│   ├── ADR-003_api-only-kiosk-cloud-communication.md
│   └── ADR-004_cursor-based-master-data-feed.md
└── change-logs/
```

## Folder Guide

### `master/`

Reference documentation for the existing, live RFID Tapping System. Read this first when assessing current behaviour or preserving compatibility.

- [SYSTEM_ARCHITECTURE.md](master/SYSTEM_ARCHITECTURE.md) — Current WPF kiosk architecture, local SQLite behaviour, direct MySQL dependencies, tapping flow, synchronization, and deployment model.
- [TECHNICAL_DOCUMENTATION.md](master/TECHNICAL_DOCUMENTATION.md) — Current project structure, build/deployment commands, schema/table usage, configuration, and operations/troubleshooting notes.

### `sys-design-plan/`

Target-state architecture and data-design documents for Adaptive Station.

- [ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md](sys-design-plan/ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md) — Product definition, MVP scope, stack, multi-tenant architecture, local-first synchronization, existing-school-system integration, migration approach, milestones, and acceptance criteria.
- [ADAPTIVE_STATION_DATABASE_DESIGN.md](sys-design-plan/ADAPTIVE_STATION_DATABASE_DESIGN.md) — MySQL multi-tenant and kiosk SQLite schemas, relationships, DDL examples, security boundaries, sync data rules, and legacy-import traceability.

### `implementation-plans/`

Execution plans derived from the MVP milestones. Each follows this naming convention:

```text
IP-00x_YYYY-MM-DD.md
```

| Plan | Milestone | Focus |
|---|---|---|
| [IP-001](implementation-plans/IP-001_2026-09-02.md) | 0 | Product, migration, and pilot-school foundation. |
| [IP-002](implementation-plans/IP-002_2026-09-02.md) | 1 | Laravel multi-tenant foundation and portal access. |
| [IP-003](implementation-plans/IP-003_2026-09-02.md) | 2 | Device API and local-first kiosk synchronization. |
| [IP-004](implementation-plans/IP-004_2026-09-02.md) | 3 | School administration portal and reporting. |
| [IP-005](implementation-plans/IP-005_2026-09-02.md) | 4 | Existing School Management System integration and migration. |
| [IP-006](implementation-plans/IP-006_2026-09-02.md) | 5 | Pilot hardening and production release. |

### `milestone-0-foundation/`

The concrete Milestone 0 (IP-001) output documents — the artifacts IP-001's work plan exists to produce.

- [DATA_OWNERSHIP_AND_TENANT_MODEL.md](milestone-0-foundation/DATA_OWNERSHIP_AND_TENANT_MODEL.md) — Approved data-ownership matrix and tenant model, including the settled MVP decisions on RFID-card ownership, notification ownership, and legacy attendance export.
- [LEGACY_FIELD_MAPPING.md](milestone-0-foundation/LEGACY_FIELD_MAPPING.md) — Full field-level mapping from every legacy table/column named in `master/TECHNICAL_DOCUMENTATION.md` to Adaptive Station's schema, including fields explicitly not migrated.
- [PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md](milestone-0-foundation/PILOT_ONBOARDING_AND_MIGRATION_CHECKLIST.md) — Actionable pilot onboarding/migration/cutover/rollback checklist template.
- [ACCEPTANCE_SCENARIOS_AND_RECONCILIATION.md](milestone-0-foundation/ACCEPTANCE_SCENARIOS_AND_RECONCILIATION.md) — Approved MVP acceptance scenarios and the required import-reconciliation counts/invariants.
- [ENVIRONMENT_BASELINE.md](milestone-0-foundation/ENVIRONMENT_BASELINE.md) — Dev/staging/production environment variable conventions, secret-handling rules, and logging/backup expectations.

### `adr/`

Architecture Decision Records. Add an ADR when a significant technical or product decision is made, especially one with alternatives or long-term consequences.

Naming convention:

```text
ADR-00x_short-decision-title.md
```

- [ADR-001](adr/ADR-001_shared-database-tenant-model.md) — Shared-database tenant model.
- [ADR-002](adr/ADR-002_retain-wpf-kiosk-for-mvp.md) — Retain the existing WPF kiosk for the MVP.
- [ADR-003](adr/ADR-003_api-only-kiosk-cloud-communication.md) — API-only kiosk-to-cloud communication.
- [ADR-004](adr/ADR-004_cursor-based-master-data-feed.md) — Cursor-based master-data change feed.

### `change-logs/`

Reserved for dated documentation and product-change records. Use it to explain material changes to the architecture, schema, API contract, migration strategy, or implementation plans.

Suggested naming convention:

```text
CL-00x_YYYY-MM-DD_short-change-title.md
```

## Recommended Reading Order

1. Read `master/` to understand the existing live system and its constraints.
2. Read the MVP system design to understand the intended standalone Adaptive Station product.
3. Read the database design before implementing migrations, APIs, or kiosk synchronization.
4. Read `milestone-0-foundation/` and `adr/` for the approved decisions, mappings, and baselines the implementation plans assume.
5. Execute the implementation plans in numerical order.
6. Record major deviations or decisions in `adr/` and `change-logs/`.

## Core Product Principles

- RFID taps are saved to kiosk SQLite before any network operation.
- Kiosks communicate with Adaptive Station through HTTPS APIs, never direct central MySQL access.
- Every tenant's data is logically isolated in the shared MySQL database.
- Existing School Management Systems remain optional integrations, not kiosk runtime dependencies.
- Legacy schools can be migrated with traceable, idempotent imports and reconciliation before cutover.
