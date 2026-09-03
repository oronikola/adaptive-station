# Legacy Field Mapping — Existing RFID Tapping System → Adaptive Station

**Milestone:** 0 (IP-001), consumed by Milestone 4 (IP-005)
**Status:** Approved as the MVP mapping specification
**Sources:** `docs/master/TECHNICAL_DOCUMENTATION.md`, `docs/master/SYSTEM_ARCHITECTURE.md`, `docs/sys-design-plan/ADAPTIVE_STATION_DATABASE_DESIGN.md` (§4, §7)

This document expands the high-level source-mapping tables already in `ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` (Addendum) and `ADAPTIVE_STATION_DATABASE_DESIGN.md` §7 into every legacy field named in the technical documentation, so Milestone 4's importer has a complete, unambiguous specification and no field is silently dropped.

All imported rows use the stable-identity pattern required for idempotent re-import (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §4.4, §7):

```text
source_system    = legacy_tapping | legacy_kiosk_local
source_record_id = legacy primary key / unique_key
import_batch_id  = migration execution identifier
```

## 1. `studinfo` (+ `gradelevel` join) → `people` (student rows)

Legacy student records are read via `SELECT s.*, g.levelname AS levelname FROM studinfo s LEFT JOIN gradelevel g ON g.id = s.levelid` (`TECHNICAL_DOCUMENTATION.md`). Exact `studinfo` column names are school-specific and are not enumerated in the legacy documentation beyond this join; the pilot connector must discover them from the pilot school's actual schema (`IP-001` work item 5). The conceptual attributes below are what the legacy application is known to read and display.

| Legacy attribute (conceptual) | Adaptive Station field | Transformation rule |
|---|---|---|
| Student primary key | `people.external_id`, `people.source_record_id` | Preserve as-is string; both fields carry the same legacy key. |
| Name field(s) | `people.first_name`, `middle_name`, `last_name`, `display_name` | Split/trim as the source schema provides; `display_name` is always derived, never left blank. |
| `levelid` → `gradelevel.levelname` | `people.grade_level` | Copy the joined `levelname` string. |
| Section (if present in source schema) | `people.section` | Copy as-is. |
| Photo path/URL column | `people.photo_url` | Absolute HTTP/HTTPS URLs are kept as-is. Local/relative paths are flagged for manual review — see §6 "Not Migrated." |
| Father/mother/guardian names, phone numbers, primary-contact flag | `people.metadata` (JSON) | Normalize Philippine phone formats (`09...`, `9...`, `639...` → `+639...`, per `PhoneNumberNormalizer` behavior in `TECHNICAL_DOCUMENTATION.md`) and store as structured JSON; the MVP schema has no dedicated contacts table. |
| Enrollment/active-status column (if present) | `people.is_active`, `people.deactivated_at` | Inactive/withdrawn students import as `is_active = 0` with a `deactivated_at` timestamp rather than being skipped. |
| — (fixed) | `people.person_type` | Always `'student'`. |
| — (fixed) | `people.source_system` | Always `'legacy_tapping'`. |

## 2. `teacher` → `people` (staff rows)

Same rules as §1, with these differences: no `gradelevel`/section mapping, `people.person_type = 'staff'` (fixed), and the legacy `utype` value for this population is `1` (see §3).

## 3. RFID column (auto-detected alias) → `rfid_cards`

The legacy app auto-detects the RFID column per table from this alias list and caches the discovered name per `server/database/table` (`TECHNICAL_DOCUMENTATION.md` "RFID Column Aliases"):

```text
rfid, rfid_no, rfidno, rfidtag, rfid_tag, card_id, cardid, uid, tag_id, tagid
```

| Legacy attribute | Adaptive Station field | Transformation rule |
|---|---|---|
| Detected RFID column value | `rfid_cards.card_uid` | Trim and case-normalize per scanner convention (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §4.3) before persisting. |
| Owning student/teacher record | `rfid_cards.person_id` | Resolve to the already-imported `people.id` for the same source record. |
| — (fixed) | `rfid_cards.is_active` | `1` unless the source explicitly marks the card inactive/replaced. |
| — (fixed) | `rfid_cards.assigned_at` | Import-time timestamp if no source assignment date exists. |
| Owning record's primary key (or a dedicated card-record ID if the source table has one) | `rfid_cards.source_system` = `'legacy_tapping'`, `rfid_cards.source_record_id` | Falls back to `tenant_id + normalized card_uid` as the stable identity when no dedicated source card-record ID exists, per `ADAPTIVE_STATION_DATABASE_DESIGN.md` §7 import safeguards. |

Per the settled ownership decision ([DATA_OWNERSHIP_AND_TENANT_MODEL.md](DATA_OWNERSHIP_AND_TENANT_MODEL.md)), this import is **one-way and one-time per card**: after import, Adaptive Station is the sole owner of card assignment going forward.

## 4. `taphistory` → `tap_events`

Full field list from `TECHNICAL_DOCUMENTATION.md`:

| `taphistory` field | Adaptive Station field | Transformation rule |
|---|---|---|
| `tdate` + `ttime` | `tap_events.occurred_at`, `occurred_offset_minutes` | Combine into one instant, interpreted in the tenant's configured timezone, then normalized to UTC; `occurred_offset_minutes` records that tenant-timezone offset at the original tap time. |
| `tapstate` | `tap_events.event_type` | Map to `'IN'` / `'OUT'`; confirm the pilot's exact `tapstate` value convention during pilot schema review (IP-001 item 5). |
| `studid` | `tap_events.person_id` | Resolve via the imported `people.source_record_id` for the same tenant (matches whether the person came from `studinfo` or `teacher`). |
| `utype` | `tap_events.person_type` | `1 → 'staff'`, `7 → 'student'`. |
| `mode` | `tap_events.metadata.legacy_mode` (JSON) | No dedicated destination column; retained for traceability. All imported rows are already scoped by `source_system = 'legacy_tapping'`, so `mode = 'rfid'` is the expected/default case. |
| `tapstatus` | `tap_events.metadata.legacy_tapstatus` (JSON) | Traceability only; not used by any new business logic. |
| `station_id` (legacy) | `stations.legacy_station_id`, then `tap_events.station_id` | Legacy station IDs are mapped once to created Adaptive Station `stations` rows (§5 below); `tap_events.station_id` stores the new station's UUID. |
| `createddatetime` | `tap_events.received_at` | Represents when the legacy system captured the row — distinct from the tap's actual `occurred_at`. |
| `updated_at` | Not migrated | `tap_events` is immutable/append-only in Adaptive Station (`ADAPTIVE_STATION_DATABASE_DESIGN.md` §4.4); there is no destination column to update. |
| Primary key / stable unique key | `tap_events.source_system = 'legacy_tapping'`, `source_record_id` | Primary de-duplication key for re-import safety (`ADAPTIVE_STATION_DATABASE_DESIGN.md` `uq_tap_events_import_source`). |

## 5. Legacy kiosk/station IDs → `stations`

| Legacy attribute | Adaptive Station field | Transformation rule |
|---|---|---|
| Legacy kiosk/station identifier (`taphistory.station_id`, `tapbunker.station_id`) | `stations.legacy_station_id` | Stored for traceability; a new Adaptive Station `stations` row (with a generated UUID and tenant-scoped `station_code`) is created per legacy station encountered during import. |

## 6. Existing kiosk local SQLite `attendance` → `tap_events`

Full field list from `TECHNICAL_DOCUMENTATION.md` ("Local Attendance Write") / `SYSTEM_ARCHITECTURE.md`:

| Local `attendance` field | Adaptive Station field | Transformation rule |
|---|---|---|
| `unique_key` | `tap_events.source_system = 'legacy_kiosk_local'`, `source_record_id` | Distinct `source_system` value from `taphistory` imports, so a row that exists in both the kiosk's local queue and the remote `taphistory` table can be recognized as the same event and imported only once (via the fingerprint fallback in `ADAPTIVE_STATION_DATABASE_DESIGN.md` §7 when the two systems' keys don't directly correlate). |
| `attendance_date` + `attendance_time` | `tap_events.occurred_at`, `occurred_offset_minutes` | Same combination rule as `taphistory`. |
| `state` | `tap_events.event_type` | Map to `'IN'` / `'OUT'`. |
| `person_id` (local FK) | `tap_events.person_id` | **Not** reused directly — local kiosk row IDs are per-kiosk autoincrement values, not stable across devices. Resolve via the cached person's `external_id`/RFID instead. |
| `person_type` | `tap_events.person_type` | Copy as-is. |
| `rfid` | Used to resolve `person_id`/card only | Not stored as a separate destination column; `tap_events.card_uid` serves this role once the event is imported. |
| `sync_status` | Import selection filter | Only rows not already confirmed present in `taphistory` (by source key or fingerprint) are imported, per the migration workflow's duplicate-evaluation step (`ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` Addendum step 6). |
| `notification_sync_status` | Not migrated | Relates to the legacy SMS queue, which is archived per §7 below. |
| `created_at` | `tap_events.received_at` | Local-origin equivalent of `taphistory.createddatetime`. |

## 7. `tapbunker` → Archived, not imported

Per the settled MVP decision ([DATA_OWNERSHIP_AND_TENANT_MODEL.md](DATA_OWNERSHIP_AND_TENANT_MODEL.md)), the legacy SMS queue is **archived by default and not imported**. Its fields (`message`, `receiver`, `pushstatus`, `smsstatus`, `station_id`, `rfid`, `tapstate`, `createddatetime`, `updated_at`) have no destination in Adaptive Station for the MVP. If a future pilot genuinely needs outstanding legacy notification work preserved, it is archived to an export file for reference, not modeled as Adaptive Station data.

## 8. Fields With No Destination (Explicitly Not Migrated)

- **Ad slideshow settings and ad media files** — kiosk display/ad configuration is rebuilt fresh through Adaptive Station's device `GET /api/v1/device/config` endpoint and portal-managed station configuration (IP-004); nothing from the legacy ad system is imported.
- **`display_settings` JSON** (scanner clock, scan-modal styling, labels, barcode/ID visibility) — same as above; reconfigured fresh per station in the new portal.
- **Local kiosk `user` table (admin accounts), `sync_log`, `audit_log`** — replaced by Adaptive Station portal users/roles and the new `audit_logs` table. Legacy admin credentials are never migrated; first-run password provisioning is required per the MVP security requirements (`ADAPTIVE_STATION_MVP_SYSTEM_DESIGN.md` §11).
- **Photo-resolution local search-path fallback chain** (`AppBase\photos`, `%LOCALAPPDATA%\...\photos`) — Adaptive Station stores `photo_url` directly. Legacy photos reachable only via local file paths (not an HTTP(S) URL) are flagged as a manual-review import exception rather than auto-migrated.
- **`setup` table's `remote_db_*` / `cloud_db_*` connection fields** — meaningless under the new architecture, since kiosks never hold database credentials ([ADR-003](../adr/ADR-003_api-only-kiosk-cloud-communication.md)). Never migrated under any circumstance.
