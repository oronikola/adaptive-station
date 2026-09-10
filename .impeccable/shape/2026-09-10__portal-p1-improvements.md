# Shape Brief — Portal P1 Improvements
**Date**: 2026-09-10  
**Derived from**: Post-slate-rebrand audit (12/20) and prior critique (24/40)  
**Background session**: No user confirmation available — assumptions marked ⚠️

---

## Brief 1: Portal Table Responsive Adaptation

### Job and audience
**School registrars and IT staff** using the portal in a desktop browser. The portal is office-first, but staff increasingly use 13" laptops at 125–150% system zoom, or share a screen with two windows open. ⚠️ *Assumed context based on school-office operating context in PRODUCT.md*.

### Outcome and proof
Tables must not cause horizontal body scroll at any viewport width above 640px. Row data must remain readable; columns may compress, abbreviate, or stack their less-critical fields.

### Selected direction
- **Structural**: Wrap every `<table>` in `pf-table-wrapper` (already has `overflow-x: auto` in `platform-dashboard.css` — verify existing markup uses this wrapper).
- **Column priority**: On narrow viewports, hide lower-priority columns via `hidden sm:table-cell` pattern. Priority order per table type:
  - **People**: Name (always visible), Status (always), ID number, RFID card, Section, Action  
  - **RFID Cards**: Card UID (always), Assigned person (always), Status, Issued at, Action  
  - **Users**: Name (always), Role (always), Status, Email, Created, Action  
  - **Attendance**: Name (always), Time (always), Direction, Station, Date  
  - **Imports**: File (always), Status (always), Type, Rows, Created, Action  
- **Filter form**: Filter panels above tables should wrap to a 2-column grid on sm, 4-column on md+. Currently all filters are single-column stacked — ⚠️ *assumed from code review*.
- **Pagination**: Already uses flex-wrap — no change needed.

### Scope and boundaries
- **In scope**: All 10+ Admin list screens; filter form grid layout; table column visibility.
- **Out of scope**: Rewriting navigation, the shell, kiosk screen, landing page.
- **Fidelity**: Production-ready changes, not prototype.
- **Anti-goals**: Do not shrink type sizes to fit tables. Do not remove columns on desktop. Do not change table data or row structure.

### States and ranges
- Minimum viable viewport: 640px (Tailwind `sm`).
- Tables have 4–8 columns typically; max 2–3 columns should be "always visible".
- Empty tables already have correct empty-state treatment — no change.

### Interaction and layout
1. Add `<div class="pf-table-wrapper">` wrapping every raw `<table>` that isn't already inside one.
2. Apply `className="hidden sm:table-cell"` to lower-priority `<th>` + matching `<td>` columns.
3. Filter panels: replace single-column `flex-col gap-4` with `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3`.

### Constraints
- Tailwind utility classes only (no new CSS classes unless unavoidable).
- Do not change server-side data structure.
- Each table screen is a separate `.tsx` file — changes are per-file, not component-level.

---

## Brief 2: ARIA + Focus Ring Hardening

### Job and audience
**All portal users** who use keyboards or assistive technology. This is a WCAG AA compliance gap, not a new feature. The primary audience is daily operators who tab through forms quickly, plus any staff or students using screen readers.

### Outcome and proof
Every interactive element reachable by tab must have a visible focus ring. Modals must be announced as dialogs. Status badges must be announced as status. Table headers must have `scope`.

### Selected direction
**Systematic, lightweight pass** — add ARIA without restructuring any component. Use the existing CSS `.pf-btn`, `.pf-field`, and modal elements as the scaffolding.

#### Modal hardening (highest WCAG impact)
- `<div className="pf-modal-overlay">` → add `role="dialog"` `aria-modal="true"` `aria-labelledby="[modal-title-id]"`
- `<h3 className="pf-modal-title">` → add `id="[unique-modal-title-id]"` matching the `aria-labelledby`
- Focus trap: when modal opens, focus must move to the first focusable element inside; when modal closes, focus returns to the trigger button.
- ⚠️ *The current `<Modal>` component in `users-list-screen.tsx` wraps an Inertia `<Modal>` component — check if Inertia's Modal already provides focus trap and ARIA dialog semantics before adding duplicates.*

#### Table header scope
- Every `<th>` in a data table → add `scope="col"`.
- Every leading cell in a row (if used as a row header) → `scope="row"`.

#### Status badge semantics
- Dynamic badges that change value (e.g. sync status) → add `role="status"` `aria-live="polite"`.
- Static badges (e.g. record status that doesn't change on-page) → no live region needed, but verify they have text content (not just colour).

#### Focus rings
Add to `platform-dashboard.css` a single global rule covering all interactive portal elements:

```css
/* Focus visible ring for portal interactive elements */
.pf-interactive:focus-visible,
.pf-table td a:focus-visible,
.pf-pagination a:focus-visible,
.pf-pagination button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px #475569;
    border-radius: inherit;
}
```

Apply `pf-interactive` class to: sort headers (if clickable), row action links, pagination page buttons that aren't already `pf-btn`.

#### `integrations-create-screen` modal fix
- Change `<form className="pf-modal">` → `<form className="pf-panel">` (layout wrapper, not a dialog overlay).
- This is a semantic fix; no visual change expected.

### Scope and boundaries
- **In scope**: All modal dialogs (deactivation modal, delete-account modal); all portal data tables; status badges in list views; integrations-create semantic fix.
- **Out of scope**: Kiosk screen, landing page, auth pages, navigation shell (already has ARIA).
- **Fidelity**: Production-ready; no new UI patterns, only ARIA/focus attributes added.
- **Anti-goals**: Do not change visual design. Do not rebuild component structure. Do not introduce new dependencies.

### States and ranges
- Focus ring must be visible in both the default light theme and over the dark shell (the topbar buttons already have ring-offset-white handling).
- Modals: single modal at a time in current implementation — no nested modal stack to handle.

### Interaction and layout
1. Modal: add role/aria attributes; verify or add focus trap in the `<Modal>` component (check InertiaUI's Modal first).
2. Tables: `scope="col"` on all `<th>`.
3. Status badges: `role="status"` on dynamic ones, verify text readability on static ones.
4. CSS: add global focus-visible ring rule to `platform-dashboard.css`.
5. Fix integrations-create form class.

### Constraints
- If `<Modal>` from Inertia/HeadlessUI already provides focus trap and `role="dialog"`, do not duplicate — just verify.
- WCAG AA is the target (4.5:1 contrast, 2.4.7 focus visible, 4.1.2 name/role/value).

---

## Sequencing

Run in this order (each step is self-contained):

1. **`/impeccable adapt`** → Brief 1 (responsive tables + filter grid)
2. **`/impeccable harden`** → Brief 2 (ARIA + focus rings)
3. **`/impeccable polish`** → Final token cleanup (P2 colour deviations: `#d7dde7`, `#f59e0b`, `#fecaca`, `#162033`)
4. **`/impeccable audit`** → Re-run to confirm score improvement (target: 16+/20)
