# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**School registrars / admin staff** — office staff who manage student records, RFID card assignments, and attendance reports daily. Primary operators of the school portal.

**IT staff / system admins** — technical users who provision kiosk devices, manage integrations with legacy systems, and troubleshoot station health.

**Platform administrators** — SaaS operators who onboard schools (tenants), manage platform-level stations, and monitor the system across all tenants.

**Kiosk users** — students and staff who tap their RFID card at a physical station; they interact only with the kiosk screen.

**Parents** — passive recipients of SMS attendance notifications; no direct UI access.

## Product Purpose

Adaptive Station is an offline-first RFID attendance management system for schools. It records every card tap to local device storage before involving the network, giving the kiosk an immediate response even during connectivity loss. Pending events sync safely when connectivity returns, with device-generated IDs preventing duplicate records. School teams can then search attendance, monitor station health, and export reports.

## Positioning

The product saves tap events locally first and syncs later — a conventional system waits for a live network response at the moment of tap. After an outage, Adaptive Station retries queued events automatically; conventional systems leave uncertain gaps or require manual recovery.

## Operating Context

- Physical kiosks are placed at school entrances or checkpoints; students tap as they arrive or leave.
- School admins work in a web portal (desktop browser, office environment) for setup, imports, and daily operations.
- Platform admins access a separate admin interface to manage school tenants and platform-level station records.
- Schools may integrate with legacy student information systems via import batches (CSV) or API integrations.
- SMS gateway devices relay notifications to parents when a student taps.

## Capabilities and Constraints

- Multi-tenant: each school is isolated; cross-tenant data access is not permitted.
- Three user surfaces: Platform (SaaS operator), Admin/Portal (school), Kiosk (physical device).
- Kiosk runs in-browser with IndexedDB; activation and sync use authenticated HTTPS APIs.
- RFID cards are assigned to people (students/staff) and can be deactivated or replaced.
- Import batches support CSV upload and external integration connectors.
- Attendance data is queryable per student, per date range, with export capability.
- Product name is a working title ("Adaptive Station") — not yet confirmed for external use.

## Brand Commitments

No confirmed external brand assets. Logo component exists (`StationLogo`) — treat as in-progress. Name is provisional.

**Visual direction (user-confirmed, binding, as of 2026-09-16):** Royal blue system — brand blue `#234ef4` over a deep-navy brand scale (`--as-brand-dark: #071c44 → --as-brand: #0b2a5b → --as-brand-mid: #174a96`) — anchors the app chrome across all authenticated surfaces (platform, admin portal, kiosk-adjacent). Pattern: white/off-white content cards float on a light slate-tinted canvas (`--as-bg: #f1f5fb`); sidebar and topbar use frosted glass (`--as-sidebar-glass-bg`, `--as-topbar-bg`, `backdrop-blur`). Pill-shaped nav links; active state is a solid royal-blue pill with white text. Glass shimmer effect on primary buttons (royal-blue gradient). Full dark-mode support via a parallel `:root.dark` token set (toggle in the header/sidebar, persisted, defaults to OS preference until the user picks explicitly). Design tokens defined as `--as-*` CSS custom properties in `app.css`.

Superseded history: a slate-shell direction (`#0f172a → #1e293b → #334155`, replacing an earlier electric-blue `#2144c9` world) was confirmed on 2026-09-10 (commit `ce205ea`) and DESIGN.md still describes that slate world. The royal-blue palette above returned five days later during `fe7e3bb` ("reconcile dashboard and navigation redesign"), apparently as a side effect of merging redesign branches rather than a deliberate re-decision — but the user confirmed on 2026-09-16 that royal blue is the current, intended direction, not a regression to revert. DESIGN.md is being regenerated from the current code to match.

## Evidence on Hand

- Full Laravel + Inertia.js + React codebase with working routes, controllers, and pages.
- Landing page copy describing capabilities and comparison with conventional attendance systems.
- DESIGN.md exists but (until this pass) documented the superseded slate world rather than the current royal-blue implementation — see Brand Commitments.
- No committed screenshots or visual regression fixtures.

## Product Principles

1. **Capture first, sync second.** The tap is never blocked by the network; the kiosk must always respond immediately.
2. **Data is school-isolated.** No school sees another's records; provisioning and access are tightly scoped.
3. **Operations over ceremony.** School staff repeat the same workflows daily — the UI must reward efficiency, not onboarding.
4. **Quiet confidence.** Status, health, and errors must be clearly visible without demanding attention when everything is working.
5. **Recoverable by default.** Imports, sync, and credentials support retry, replacement, and revocation; dead ends are not acceptable.

## Accessibility & Inclusion

Standard WCAG AA baseline. No product-specific requirements established.
