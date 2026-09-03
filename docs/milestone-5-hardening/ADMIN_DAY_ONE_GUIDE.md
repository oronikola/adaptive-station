# Tenant Administrator Day-One Guide

**Milestone:** 5 (IP-006 work item 8)
**Audience:** A school's tenant_admin, on their first day using Adaptive Station
**Status:** Ready to use — reflects the actual portal built in IP-004/IP-005

This is a quick-reference tour of the portal, not a full manual. Every workflow below requires no database access — everything is done through the web portal.

## People

**People → Add Person** registers a student or staff member (`Person::registerForTenant`). Required: name, type (student/staff); optional: grade level, section, photo URL, contact metadata. Edit an existing person from the People list; deactivating a person (rather than deleting) preserves their history while removing them from active kiosk lookups.

## RFID Cards

**RFID Cards → Assign** links a physical card's UID to a person. If a card is lost or replaced, use **Replace** on the person's existing card — this deactivates the old card and creates a new one (never edits a card UID in place), so a kiosk that cached the old card correctly stops accepting it.

## Stations

**Stations** lists every kiosk for your school. Click into one to:

- View its sync health (online/offline, last seen, pending event count).
- Edit its configuration (display/operational settings, delivered to the kiosk on next sync).
- Issue or revoke device credentials.
- Issue an activation code for a not-yet-activated station (see `STATION_ACTIVATION_GUIDE.md`).

Creating a *new* station record is a platform-admin action during onboarding — contact platform support to add a new kiosk to your school.

## Users

**Users** lets a tenant_admin invite additional admins or operators for their own school. A newly invited user receives a temporary password (shown once) and is forced to reset it on first login. Operators have day-to-day access (attendance, people, cards); only admins manage users, stations, and integrations.

## Attendance

- **Attendance** — row-level search by date range, person, card, station, or event type; export to CSV.
- **View Daily Summary** (linked from the search page) — grouped daily totals and unique-people counts for a date range, useful for a quick "did today look normal" check without scrolling through individual events.

## Integrations (legacy system connectivity)

Visible only to admins (not operators) — this area touches your school's legacy database credentials.

- **Integrations** — configure a connection profile to your existing tapping system (host/credentials/table mapping, encrypted at rest, never shown again after saving).
- **Imports** — run a **Preview** first (shows counts, writes nothing) before **Commit** (the real import). Re-running Commit is always safe — already-imported records are skipped, never duplicated.
- Any row the importer couldn't confidently match shows up under that import's **Exceptions** — resolve or ignore each one; per the migration sign-off rule, no import is considered complete for cutover while exceptions remain unresolved.
- If your school needs the legacy system's own reports to keep working during a transition period, use **Run Attendance Export** on the integration profile's page — one-way, safe to re-run over the same date range.

## Getting Help

See `SUPPORT_AND_INCIDENT_RUNBOOK.md` for what to do if something looks wrong (missing attendance, a station won't sync, a device token may be compromised).
