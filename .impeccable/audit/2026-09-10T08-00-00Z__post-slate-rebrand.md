# Impeccable Audit — Post Slate Rebrand
**Target**: All `/portal` Admin + Platform screens  
**Date**: 2026-09-10  
**Context**: Post electric-blue → slate rebrand; DESIGN.md written; first audit pass under new colour system

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Sparse ARIA, no focus rings in page content, tables lack scope |
| 2 | Performance | 3/4 | 25 `backdrop-filter` instances; otherwise clean |
| 3 | Responsive Design | 1/4 | Zero breakpoints in portal TSX; tables overflow on mobile |
| 4 | Theming | 3/4 | Rebrand complete; 3 undocumented inline colours remain |
| 5 | Implementation Integrity | 3/4 | Detector: 9 advisory; modal semantic misuse in integrations-create |
| **Total** | | **12/20** | **Acceptable — significant work needed on responsive and a11y** |

---

## Implementation Integrity Verdict

**PASS (with caveats).** The codebase expresses a coherent, product-specific design system. The `pf-*` namespace is consistently used across all 20+ portal screens. The `--as-*` CSS token system is well-applied in CSS. The slate rebrand has been fully applied (0 legacy electric-blue hex values).

Detector ran over Admin + Platform + Profile: **9 advisory findings, 0 errors, 0 warnings.** All are minor undocumented colour deviations or one type-ramp miss — none indicate systemic drift.

Caveats:
1. `integrations-create-screen.tsx` still uses `<form className="pf-modal">` — semantic misuse (pf-modal wraps the overlay, not the form).
2. `#d7dde7` appears in 3 files as an undocumented border color — functionally equivalent to `--as-border` but not aliased.
3. `#f59e0b` (Tailwind amber-400) used in SMS gateway device indicators instead of `--as-warning: #c1791f`.

---

## Executive Summary

- **Health: 12/20 — Acceptable**
- **P0**: 0 | **P1**: 3 | **P2**: 4 | **P3**: 3
- The rebrand is clean and the design system is coherent.
- The two biggest gaps are **responsive design** (portal is desktop-only with no table scroll protection) and **accessibility** (sparse ARIA, no focus rings in page-body interactive elements).
- These are pre-existing structural gaps, not regressions from the rebrand.

---

## Detailed Findings

### P1 — Major

---

**[P1] No overflow-x scroll wrapper on any portal table**  
- **Location**: All 16 Admin data tables (people-list, rfid-cards-list, users-list, imports-list, attendance-search, etc.)  
- **Category**: Responsive Design  
- **Impact**: Tables overflow the viewport on screens narrower than ~900px, causing horizontal body scroll. School staff on laptops with browser zoom ≥125% will experience this.  
- **Recommendation**: Wrap every `<table>` in `<div class="overflow-x-auto">` (Tailwind) or the CSS equivalent. The `pf-table-wrapper` selector in `platform-dashboard.css` already has `overflow-x: auto` — verify all table components are wrapped in it.  
- **Suggested command**: `/impeccable adapt`

---

**[P1] Sparse ARIA across portal page content**  
- **Location**: All Admin/Platform screens — 26 `aria-label` / `role` usages across 20+ screens  
- **Category**: Accessibility — WCAG 2.1 AA (1.3.1 Info and Relationships, 4.1.2 Name, Role, Value)  
- **Impact**: Screen readers cannot identify interactive regions, filter forms, data tables, or status changes. Particularly critical for status badges (no `role="status"`) and modals (no `role="dialog"`, `aria-modal`).  
- **Missing specifically**: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on modals; `role="status"` on async status badges; `scope="col"` on table header cells; `aria-label` on icon-only sidebar toggle.  
- **Recommendation**: Add landmark roles and ARIA attributes systematically. The navigation components are well-labelled (good pattern to replicate).  
- **Suggested command**: `/impeccable harden`

---

**[P1] No focus rings in portal page-body interactive elements**  
- **Location**: All Admin/Platform `.tsx` screens — 0 `focus:ring` or `focus-visible` Tailwind classes  
- **Category**: Accessibility — WCAG 2.1 AA (2.4.7 Focus Visible)  
- **Impact**: Keyboard users cannot track focus position within page content (tables, filter controls, pagination). Focus rings exist only on `pf-btn` via CSS, not on other clickable elements (sort headers, row actions, pagination links, etc.).  
- **Recommendation**: Add `focus-visible:ring-2 focus-visible:ring-[#475569] focus-visible:outline-none` to all interactive non-button elements in portal screens. Or add a global `.pf-interactive:focus-visible` rule in `platform-dashboard.css`.  
- **Suggested command**: `/impeccable harden`

---

### P2 — Minor

---

**[P2] Undocumented colour `#d7dde7` used in 3 screens**  
- **Location**: `integrations-create-screen.tsx:109`, `integrations-edit-screen.tsx:46`, `station-detail-screen.tsx:189`  
- **Category**: Theming / Implementation Integrity  
- **Impact**: A near-duplicate of `--as-border: #e2e8f0` that isn't in the design token system. Slight visual inconsistency; maintenance risk when the token is updated.  
- **Recommendation**: Replace `#d7dde7` with `var(--as-border-mid)` (`#cbd5e1`) or add it to the DESIGN.md sidecar as `border-strong`.  
- **Suggested command**: `/impeccable polish`

---

**[P2] `#f59e0b` (amber-400) used in SMS gateway device indicators**  
- **Location**: `devices-screen.tsx:145, 149, 196`  
- **Category**: Theming  
- **Impact**: Off-system warning color (`#f59e0b` vs `--as-warning: #c1791f`). Renders as a brighter, more saturated amber than all other warning states in the system — visible inconsistency.  
- **Recommendation**: Replace `#f59e0b` with `var(--as-warning)` (`#c1791f`) or add an explicit `--as-device-active` token if the semantic is "active device power on" rather than "warning". Context: this is likely an LED-style indicator, so a dedicated token makes sense.  
- **Suggested command**: `/impeccable polish`

---

**[P2] Modal semantic misuse in integrations-create-screen**  
- **Location**: `integrations-create-screen.tsx` — `<form className="pf-modal">` as form layout wrapper  
- **Category**: Implementation Integrity / Accessibility  
- **Impact**: `pf-modal` carries `role` and visual semantics of an overlay dialog. Wrapping a form in it (not as a modal dialog but as a layout container) is incorrect semantic layering and confuses screen readers. If the form ever gains `role="dialog"`, the nested structure will be broken.  
- **Recommendation**: Replace `<form className="pf-modal">` with `<form className="pf-panel">` or `<form className="pf-form-section">`. Reserve `pf-modal` for overlay dialogs only.  
- **Suggested command**: `/impeccable harden`

---

**[P2] `#fecaca` hard-coded in tenant-detail instead of `--as-danger-bg`**  
- **Location**: `tenant-detail-screen.tsx:365`  
- **Category**: Theming  
- **Impact**: Tailwind `red-200` (`#fecaca`) is used where `--as-danger-bg` (`#fef2f2`) or `--as-danger-bg-alt` (`#fdecea`) should be. Slightly different red-tinted background. Inconsistency with all other danger states in the system.  
- **Recommendation**: Replace with `var(--as-danger-bg)` or `var(--as-danger-bg-alt)`.  
- **Suggested command**: `/impeccable polish`

---

### P3 — Polish

---

**[P3] `0.75rem` font size off the type ramp in users-list**  
- **Location**: `users-list-screen.tsx:112` — `fontSize: 0.75rem` (12px inline style)  
- **Category**: Theming / Implementation Integrity  
- **Impact**: 12px is between `body: 13px` and `label: 11px` on the type scale. One off-ramp size in one screen is minor.  
- **Recommendation**: Use 11px (`label` scale) or 13px (`body` scale). Delete the inline `fontSize` and apply the appropriate `pf-` label class.  
- **Suggested command**: `/impeccable typeset`

---

**[P3] `backdrop-filter: blur()` on 25+ elements without `@supports` guard**  
- **Location**: `navigation.css`, `login.css`, `platform-dashboard.css`  
- **Category**: Performance  
- **Impact**: Browsers without `backdrop-filter` support (some Linux browsers, Firefox < 70) will show transparent panels instead of frosted glass — not catastrophic, but not gracefully degraded. Performance on mid-range mobile can be choppy.  
- **Recommendation**: Add `@supports (backdrop-filter: blur(1px))` guards around the most visually dependent rules (login card, topbar). The sidebar shell can lose its blur without obvious visible breakage.  
- **Suggested command**: `/impeccable optimize`

---

**[P3] `#162033` hard-coded in station-detail (darker-than-system navy)**  
- **Location**: `station-detail-screen.tsx:193`  
- **Category**: Theming  
- **Impact**: A shade darker than `--as-brand-dark: #0f172a`. One-off value with no system equivalent. Low visual impact.  
- **Recommendation**: Replace with `var(--as-brand-dark)` or add `--as-brand-darkest: #162033` to the token set if intentional.  
- **Suggested command**: `/impeccable polish`

---

## Patterns & Systemic Issues

1. **Portal TSX screens contain zero responsive breakpoints** — all layout adaptation is handled exclusively in CSS (the sidebar, shell, topbar). The page content itself (filters, forms, tables) has no responsive treatment. This is a systemic gap: adding `sm:` / `md:` breakpoints to Tailwind classes was never adopted for portal pages.

2. **ARIA annotations are navigator-level only** — good coverage in `AppShell.tsx`, `Sidebar.tsx`, `Header.tsx`; minimal coverage in any `resources/js/Pages/Admin/**` or `resources/js/Pages/Platform/**` file. The pattern was established at the component level but not followed in page implementations.

---

## Positive Findings

- ✅ **Rebrand complete** — Zero legacy electric-blue hex values remain in CSS, JS, or Tailwind config.
- ✅ **Design token system coherent** — `--as-*` CSS custom properties used consistently across all CSS files; Tailwind `station-*` aliases now match.
- ✅ **Detector findings are all advisory** — 9 minor color/font deviations; no structural or semantic errors from the detector.
- ✅ **`pf-*` namespace consistent** — All portal screens use the same button, panel, modal, field, and badge class naming. No one-off Tailwind components leaked in (except the three legacy Components/ files which are now correctly slated).
- ✅ **Loading states complete** — All 9 portal forms now apply `pf-btn--loading` on submission (people-create, people-edit 4 buttons, rfid-cards-list filter, people-list filter, users-create, integrations-create, integrations-edit 2 buttons).
- ✅ **`prefers-reduced-motion`** handled in all three major CSS files (app.css, navigation.css, login.css, platform-overview.css) — animations are killed for motion-sensitive users.
- ✅ **Navigation ARIA** — `aria-label="Main navigation"`, collapse button labelled, mobile toggle labelled. Good pattern.
- ✅ **Will-change: targeted** — Only one `will-change: transform` on the sidebar slide, correctly scoped. No broad will-change overuse.
- ✅ **Glass shimmer now slate-branded** — Button glass shimmers align with the new slate palette. No visual remnants of the electric-blue era.

---

## Recommended Actions (Priority Order)

1. **[P1] `/impeccable adapt`** — Add overflow-x scroll wrappers to all portal data tables. This is the highest-impact mobile fix with the least design risk.
2. **[P1] `/impeccable harden`** — Add ARIA roles to modals (`role="dialog"`, `aria-modal`, `aria-labelledby`), `scope="col"` on table headers, `role="status"` on badge elements. Fix `integrations-create` modal semantic misuse.
3. **[P1] `/impeccable harden`** — Add focus-visible rings to all non-button interactive elements in portal screens (sort headers, row actions, pagination).
4. **[P2] `/impeccable polish`** — Replace `#d7dde7`, `#fecaca`, `#162033` with correct design tokens. Replace `#f59e0b` with `--as-warning` or add an explicit device-status token.
5. **[P3] `/impeccable optimize`** — Add `@supports` guards around the most `backdrop-filter`-dependent elements.
6. **[P3] `/impeccable typeset`** — Fix the off-ramp `0.75rem` in users-list.
7. **[P0→] `/impeccable polish`** — Final quality pass once P1 and P2 items are addressed.

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/impeccable audit` after fixes to see your score improve.
