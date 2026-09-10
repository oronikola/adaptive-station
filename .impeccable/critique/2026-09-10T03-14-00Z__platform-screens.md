---
target_identity: "file:C:\\laragon\\www\\adaptive-station\\platform-screens"
timestamp: 2026-09-10T03-14-00Z
slug: platform-screens
---
# Critique: Platform Screens
**Scope:** /platform/dashboard · /platform/tenants · /platform/stations · /platform/sms-gateway/devices · /platform/audit-log  
**Mode:** Operate  
**Date:** 2026-09-10

---

## Design Health Score (Platform Surface)

| H# | Heuristic | Score | Finding |
|---|---|---|---|
| H1 | Visibility of system status | 2/4 | SMS devices have no auto-refresh — a device going offline between page loads is invisible. Backlog age shows minutes only (breaks at >60 min: "120m" instead of "2h"). Audit log has no live signal. |
| H2 | Match between system and real world | 3/4 | "Online / Offline / Deactivated" labels for SMS devices are apt. "Taps" metaphor correct everywhere. |
| H3 | User control and freedom | 2/4 | SMS Gateway Deactivate and Reset Password use `confirm()` browser dialogs, not modals — jarring after the people-edit modal pattern. Tenants tab switches away from the list on "Add Client", losing scroll position. |
| H4 | Consistency and standards | 2/4 | `confirm()` vs modal — two patterns for destructive actions in the same app. Station status pills show only active/inactive; can't distinguish `pending_activation` from `disabled` or `retired`. |
| H5 | Error prevention | 2/4 | `confirm()` dialogs provide no consequence detail ("Deactivate this device?" with no explanation of what stops). Platform stations "Issue Activation Code" fires immediately with no confirm — not destructive but wastes a one-time secret. |
| H6 | Recognition rather than recall | 3/4 | Status pills on SMS devices ("Online/Offline/Deactivated") are clear. Audit log entity IDs show 8-char UUID prefix — meaningless to anyone who doesn't know the UUID. |
| H7 | Flexibility and efficiency | 1/4 | Audit log has no filters whatsoever. Stations list has no filter by school or status. SMS Gateway has no search. At scale these surfaces become unusable. |
| H8 | Aesthetic and minimalist design | 2/4 | SMS Gateway table has 7 columns — overflows at ≤1280px. Backlog stats use `pft-hero-title` (display heading class) for inline metrics with `style={{ fontSize: 24 }}` — class abuse. |
| H9 | Error recognition and recovery | 2/4 | Backlog high-water-mark warning sits in `pf-panel-count` (small gray text below panel title) — far too quiet for an urgent operational signal. No visual distinction between "a device is offline" vs "everything is fine". |
| H10 | Help and documentation | 2/4 | Platform admin landing has no explanation of what the fleet model is. Audit log has no description of what events are captured or how long records are retained. |

**Platform surface score: 21/40**

---

## Priority Issues

### P1 — Inconsistent or broken patterns

**SMS Gateway: `confirm()` dialogs for Deactivate and Reset Password.**  
`devices-screen.tsx:57–68` — Both `revoke()` and `resetPassword()` use `if (!confirm(...)) return` — browser-native dialog, not in the design language. Deactivating a device cuts its SMS sending immediately; that deserves a modal with consequence copy. Matches the pattern established in people-edit for card deactivation. Fix: replace with a state-gated modal (same `useState<string | null>(null)` + `pf-modal` pattern).

**Station status pills only encode active/inactive, not the full vocabulary.**  
`Platform/stations/stations-list-screen.tsx:136–142` — Status column shows `pf-pill--active` for "active" and `pf-pill--inactive` for everything else, including `pending_activation`, `disabled`, and `retired`. A platform admin can't distinguish these states at a glance. Fix: add `pf-pill--suspended` for `pending_activation` and `pf-pill--archived` for `disabled`/`retired`, matching the vocabulary already defined in platform-dashboard.css.

---

### P2 — Significant friction

**Backlog high-water alert is too quiet for an urgent signal.**  
`devices-screen.tsx:126–130` — The "`oldest pending is over 30 min`" warning lives in `.pf-panel-count` (13px muted text). When the SMS queue is backlogged, a platform admin needs to notice immediately, not after reading small print. Fix: surface a visible `pf-pill--warning` or a banner-style callout above the backlog table when `backlogIsHigh`.

**SMS Gateway table has 7 columns — overflows on laptops.**  
`devices-screen.tsx:172–182` — Label / Username / Status / Last seen / Sent today / Delivered today / Failed today. At 1280px this produces a horizontal scroll. The three "today" count columns are low-value individually; group them as "Sent / Delivered / Failed" in a single cell, or collapse them. Alternatively, move the daily stats into a collapsed row detail.

**Oldest-pending time format breaks at >60 minutes.**  
`devices-screen.tsx:154` — `{Math.round(oldest_pending_age_seconds / 60)}m` shows "120m" instead of "2h", "0m" for sub-minute delays. Fix: a small format helper — `<1m` / `Nm` / `Nh Nm`.

**Audit log has no filter bar.**  
`audit-log-list-screen.tsx` — The only interaction surface is scrolling + pagination. For a platform admin investigating an incident or auditing a specific school, there is no way to filter by actor type, action name, tenant, or date range. At scale (thousands of events per day), this list is unusable for any real investigation task.

**Stations list has no filter by school or status.**  
`Platform/stations/stations-list-screen.tsx` — A platform with many schools and stations needs to find stations by school or by status (e.g., all `pending_activation`). No filter bar exists.

---

### P3 — Minor polish

- **Tenants: "Add Client" inline tab** is the only screen using tabs. Every other create flow uses a hero action → page or modal. Standardize to a modal (like Platform/stations) or hero → separate create page.
- **Audit log entity IDs:** `#a3f92b1d` (8-char UUID prefix) is meaningless. If the entity is a Person or Tenant that exists in the system, link to it. If not, show the entity_type label only.
- **Platform dashboard: two redundant Client stat cards** ("Clients" total + "Active Clients" count). The ActivationGauge widget already shows the ratio. Drop one or merge as a ratio card.
- **No auto-refresh on SMS Gateway.** Device health degrades in real time; a manual page reload cycle is inadequate for an ops screen. Even a 30-second polling refresh or Inertia `router.reload()` interval would help.

---

## What's Working

- Hero pattern, pf-panel structure, and status pills are consistent with the rest of the app.
- SMS Gateway backlog stat grid (4 numbers at a glance) is the right pattern — just needs sizing and prominence fixes.
- The "Add Station" modal pattern is correct and consistent with other create flows.
- SecretOnceCallout for one-time passwords is a smart, well-implemented component.
- Stations list correctly surfaces "Issue Activation Code" only for `pending_activation` stations — contextual action, not always-visible.
