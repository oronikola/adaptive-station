# ADR-001 — Shared-Database Tenant Model

**Date:** 2026-09-02
**Status:** Superseded 2026-09-04 — see note below. Kept as the accurate historical record of why the MVP started shared; do not treat the Decision section below as current behavior.

> **Superseding note (2026-09-04):** The product decision changed — every tenant now gets its own physical MySQL database (`adaptive_station_{code}`), provisioned automatically when the tenant is created (`App\Models\Tenant::provision()`, `App\Support\TenantDatabase`). This was a deliberate reversal, not a discovery that this ADR's original reasoning was wrong — see the codebase's `database/migrations/tenant/` (per-tenant schema) vs. the default migration path (central schema: `tenants`, `users`, `station_credentials`, `station_activation_codes`, `audit_logs`). The `tenant_id` column and `TenantScope` global scope described below are **kept** on every tenant-owned table as a deliberate defense-in-depth layer on top of physical separation, not removed — so the "Consequences" section's isolation-testing requirements still apply verbatim. What changed is *only* that physical database separation is now the primary isolation boundary; the application-layer scoping described here is the secondary one.

## Context

Adaptive Station is a multi-tenant platform: each school is a tenant with logically isolated people, cards, stations, and attendance data. Two standard multi-tenancy patterns were available: a dedicated MySQL database per tenant, or a single shared MySQL database with a `tenant_id` column enforced on every tenant-owned table.

Dedicated databases per tenant give the strongest physical isolation but multiply operational cost (migrations, backups, connection pooling, monitoring) per school, which is unnecessary overhead for an MVP aiming to onboard schools quickly and cheaply.

## Decision

The MVP uses a single shared MySQL 8 database. Every tenant-owned table carries a non-null `tenant_id`, and indexes begin with `tenant_id` where the workload is tenant-scoped (see `docs/sys-design-plan/ADAPTIVE_STATION_DATABASE_DESIGN.md` §2–§4). Tenant isolation is enforced entirely in the Laravel application layer — query scopes, policies, and authorization — not by database-level separation. MySQL foreign keys provide referential integrity only, not tenant security (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §8).

A dedicated-database-per-tenant option is explicitly deferred post-MVP (`ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §3, §15) for enterprise customers who require it.

## Consequences

- Faster, cheaper tenant onboarding: creating a tenant is a row insert, not a database provisioning step.
- Every tenant-owned model, controller, and API endpoint must apply tenant scoping without exception; a missed filter is a cross-tenant data leak, not merely a bug. IP-002's exit criteria require automated cross-tenant access-denial tests specifically because of this risk.
- Composite uniqueness (e.g. `card_uid`, `station_code`, `external_id`) is scoped to `(tenant_id, value)` rather than globally unique, since different schools may reuse the same physical card UID or station code.
- Noisy-neighbor performance isolation between tenants is weaker than with dedicated databases; acceptable for MVP scale, to be revisited if a large tenant's query volume affects others.
