# ADR-004 — Cursor-Based Master-Data Change Feed

**Date:** 2026-09-02
**Status:** Accepted

## Context

Kiosks need to keep a local cache of people and RFID cards current, including deactivations, so offline lookups reflect recent changes. A simple approach — have the kiosk request "everything changed since `updated_at > last_pull_timestamp`" — was considered as an alternative to a dedicated change-feed table.

Timestamp-based polling has known failure modes: clock skew between kiosk and server can cause a kiosk to miss changes written in the same second as its last pull, two changes with an identical timestamp can race, and a plain `updated_at` comparison cannot represent a row's deletion (there is nothing left to return with a newer timestamp).

## Decision

Adaptive Station Cloud maintains a `master_data_changes` table keyed by a monotonically increasing per-tenant `version` (not wall-clock time). Each row records an `entity_type`/`entity_id`/`operation` (`upsert`, `deactivate`, `delete`) whenever a person, card, or configuration change occurs. Kiosks send their last-applied `version` as a cursor and receive only changes newer than it; the kiosk advances its stored cursor only after committing the full batch to local SQLite in one transaction (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §4.5, §6; `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §9 "Master-data download").

## Consequences

- Deactivations and deletions are first-class, explicit events the kiosk cache applies, rather than being inferred from a row's absence.
- No dependency on synchronized clocks between kiosk and server for correctness of the sync feed.
- Every mutation to a person, card, or tenant/station configuration must additionally write (or trigger) a `master_data_changes` row — this is a mandatory side effect of those write paths, tracked explicitly in IP-004 work item 3, not an optional audit nicety.
- `master_data_changes` grows without bound unless archived; retention/archival policy is deferred to operational hardening (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §9) but must not delete rows a kiosk has not yet advanced past.
