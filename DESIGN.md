---
name: Adaptive Station
description: Offline-first school RFID attendance system — a royal-blue institutional ledger, quiet at rest, decisive when it speaks.
colors:
  brand-dark: "#071c44"
  brand: "#0b2a5b"
  brand-mid: "#174a96"
  brand-blue: "#234ef4"
  brand-blue-light: "#2863bd"
  bg: "#f1f5fb"
  surface: "#ffffff"
  surface-hover: "#f8faff"
  surface-active: "#edf3fc"
  border: "#e2e8f0"
  border-light: "#f1f5f9"
  border-mid: "#cbd5e1"
  text: "#0f172a"
  text-body: "#334155"
  text-secondary: "#64748b"
  text-muted: "#94a3b8"
  text-navy: "#1e293b"
  success: "#1a8a4c"
  success-bg: "#e3f6ea"
  warning: "#c1791f"
  warning-bg: "#fdf1e0"
  danger: "#dc2626"
  danger-dark: "#b91c1c"
  danger-bg: "#fef2f2"
  danger-border: "#fecaca"
  neutral: "#174a96"
  neutral-bg: "#edf3fc"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  pill: "999px"
  card: "28px"
  panel: "24px"
  field: "12px"
  chip: "999px"
  badge: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "28px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "linear-gradient(180deg, #5b7cee 0%, #3e66ea 50%, #2247cc 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "linear-gradient(180deg, #5b7cee 0%, #3e66ea 50%, #2247cc 100%) + brightness(1.05)"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.8)"
    textColor: "{colors.text-navy}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "42px"
  button-danger:
    backgroundColor: "linear-gradient(180deg, #f43f5e 0%, #dc2626 55%, #991b1b 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "42px"
  field-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "44px"
  status-pill:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Adaptive Station

## Overview

**Creative North Star: "The Royal Ledger"**

Adaptive Station's visual language is an administrative ledger with a confident, saturated signature: royal blue (`#234ef4`) is the identity color, but it appears with discipline — reserved for the shell's glass surfaces, primary actions, and active states, never spread thin across the page. Content lives on near-white, faintly blue-tinted surfaces (`--as-bg: #f1f5fb`, `--as-surface: #ffffff`) with soft, deep-navy ambient shadows (`rgba(10, 27, 115, ...)`) rather than pure black — every shadow in the system carries a trace of the brand color, so even the negative space feels branded.

The system runs a genuine two-mode life: a light "ledger" mode (white cards, blue accents, navy text) and a full dark mode (`:root.dark`) that inverts every surface to a deep navy-black (`#0b1220`/`#131c2e`) while keeping royal blue as the through-line — it just brightens (`#234ef4 → #9db4ff`) rather than staying identical, so it reads correctly against a dark canvas instead of vibrating. The theme follows the visitor's OS preference until they make an explicit choice via the sidebar/header toggle, then persists and syncs across tabs. Transitions between themes use the View Transitions API for a single cross-faded frame rather than per-element color animation, so the switch reads as one deliberate cut, not a flicker.

Every decision optimises for the daily operator — the registrar who opens the portal each morning and repeats the same eight flows. Status color (green/amber/red) appears only when the system has something to report; at rest, the interface is blue-and-white with confident navy text. The tactile press (`scale(0.97)` on active) and glass-shimmer sheen on primary/danger buttons give the system its one indulgence: every click has physical weight.

**Key Characteristics:**
- Royal-blue glass shell (sidebar + topbar) around white, blue-tinted content surfaces
- Full parallel dark-mode token set — not an afterthought, a first-class second state
- Status-only saturated color; the blue is identity, not decoration
- Plus Jakarta Sans for display/headings, Inter for body and UI text, JetBrains Mono for codes/IDs
- Glass shimmer + tactile press on every button; pill shapes for buttons, nav links, and badges
- Ambient shadows tinted navy-blue (`rgba(10, 27, 115, ...)`), never neutral gray

## Colors

The palette pairs one confident accent (Royal Signal) against a near-white ledger surface, with a full dark-mode inversion that keeps the same hues but re-balances every value for a dark canvas.

### Primary
- **Royal Signal** (`#234ef4`, `--as-brand-blue`): The identity color. Primary buttons, active nav pills, active pagination, focus rings, the sidebar logo badge gradient. Brightens to `#9db4ff` in dark mode rather than staying identical — kept saturated-but-legible against the dark shell instead of vibrating.
- **Deep Navy** (`#071c44`, `--as-brand-dark`): The darkest brand tone — modal titles, form headings, profile names, always-dark tooltip chips (which intentionally do not flip in dark mode; a dark tooltip reads correctly against either canvas). Flips to near-white (`#f8fafc`) in dark mode since it's predominantly used as heading text, not a background.
- **Harbor Blue** (`#174a96`, `--as-brand-mid`): Mid-weight brand presence — info-status text/badges, secondary brand accents. Flips to `#9db4ff` in dark mode.

### Neutral
- **Ledger Canvas** (`#f1f5fb`, `--as-bg`): Page background — a barely-blue white that separates the shell from pure-white content cards. Inverts to `#0b1220` in dark mode.
- **White** (`#ffffff`, `--as-surface`): Content card, panel, modal, and field surfaces. Inverts to `#131c2e`.
- **Mist** (`#f8faff` hover / `#edf3fc` active, `--as-surface-hover` / `--as-surface-active`): Interactive surface states for rows, buttons, and list items.
- **Hairline** (`#e2e8f0`, `--as-border`): Default border — card edges, dividers, input outlines. Inverts to `#263244`.
- **Ink** (`#0f172a`, `--as-text`): Primary text — headings, key values. Inverts to `#f1f5f9`.
- **Slate Body** (`#334155`, `--as-text-body`): Default paragraph/body text.
- **Pewter** (`#64748b`, `--as-text-secondary`): Secondary text, field labels' companion copy, metadata.
- **Fog** (`#94a3b8`, `--as-text-muted`): Placeholder and least-emphasis text.

### Status (saturated; context-only)
- **Confirmed Green** (`#1a8a4c`, bg `#e3f6ea`): Success, active/online status, confirmed attendance. Dark mode brightens the foreground to `#4ade80` and turns the background into a translucent tint (`rgba(26, 138, 76, 0.18)`) rather than a solid pastel, so it reads as a glow against the dark surface instead of a stray light patch.
- **Pending Amber** (`#c1791f`, bg `#fdf1e0`): Warning, pending review, suspended status.
- **Alert Crimson** (`#dc2626`, bg `#fef2f2`): Danger, destructive actions, deactivated states.
- **Harbor Info** (`#174a96`, bg `#edf3fc`): Neutral informational badge, reused as the "neutral" status tone.

### Named Rules

**The Translucent Dark Rule.** Every status/pastel background that has to work in dark mode becomes a translucent rgba tint over the dark canvas (e.g. `rgba(26, 138, 76, 0.18)`), never a solid pastel carried over unchanged from light mode. A light-mode pastel chip left solid in dark mode reads as a stray white patch on a dark page — this was a real, repeatedly-found defect class in this codebase and the rule exists specifically to prevent its reintroduction.

**The Manual Toggle Rule.** Dark mode is driven exclusively by the `.dark` class the user's explicit toggle applies to `<html>` (`Components/Theme/ThemeProvider.tsx`), never by a parallel `@media (prefers-color-scheme: dark)` block. A component that reacts to OS preference independently of the app's own toggle will visibly disagree with the rest of the page whenever the visitor's OS setting and in-app choice differ.

**The Solid Badge Exception.** A small set of tokens (`--as-brand-solid`, `--as-*-solid`) are deliberately fixed and do not flip in dark mode: solid navy/colored icon chips and badges paired with a hardcoded white foreground (modal hero icons, the active pagination pill, tooltip chips). These read as intentionally vivid accents in either theme; don't "fix" them into the flipping token set.

## Typography

**Display/Headline Font:** Plus Jakarta Sans (fallback: Inter, system-ui)
**Body Font:** Inter (fallback: ui-sans-serif, system-ui) — set as the page-wide `font-sans` default
**Mono Font:** JetBrains Mono (fallback: ui-monospace, SFMono-Regular, Menlo) — reserved for IDs, audit entity keys, integration tokens

**Character:** Plus Jakarta Sans carries headings and display moments with geometric confidence; Inter handles the high-volume reading and form work where a slightly more neutral, screen-tuned face reduces fatigue. The pairing is a deliberate two-font system, not a single-family stack — display moments get personality, everything an operator reads all day stays quiet.

### Hierarchy
- **Display** (800, `clamp(2rem, 5vw, 3.5rem)`, line-height 1.03, `letter-spacing: -0.045em`): Landing-page and auth hero headlines only.
- **Headline** (700, `24px`, line-height 1.2, `letter-spacing: -0.02em`): Page-level dashboard titles inside content cards.
- **Title** (700, `15px`, line-height 1.3, `letter-spacing: -0.01em`): Panel headers, modal titles, section titles.
- **Body** (400/500, `13px`, line-height 1.5): Paragraph text, table cells, form fields, descriptions.
- **Label** (700, `11px`, `letter-spacing: 0.08em`, uppercase): Field labels, column headers, status-pill text, kicker eyebrows.
- **Mono** (400, `11px`, JetBrains Mono): Audit-log entity IDs, integration keys — never general UI text.

### Named Rules

**The Two-Font Split Rule.** Plus Jakarta Sans is reserved for headings and hero/display moments; Inter carries everything else. A body paragraph or table cell in Plus Jakarta Sans, or a page headline in Inter, is a drift signal.

## Layout

The authenticated shell is a light, blue-tinted canvas (`--as-bg`) holding a sticky glass sidebar (260px, collapsible to a 76px icon rail) on the left and a frosted glass topbar (`--as-topbar-bg`, `backdrop-filter: blur`) across the top. Content lives in white `pf-panel` containers (`border-radius: 24px`) or the larger `pf-dashboard-header`/modal surfaces (`border-radius: 28px`), stacked vertically with 24px rhythm between panels.

**Grid:** No fixed column grid; layout is vertical stacking of panels, with CSS grid used inside individual panels (e.g. stat cards, 3–4 columns). Responsive breakpoints follow Tailwind defaults (sm 640px, md 768px, lg 1024px, xl 1280px); the sidebar collapses behind a slide-in drawer below `lg`.

**Density:** Medium-tight, built for a desktop operator in an office browser. Buttons and field inputs sit at 42–44px height; table rows run comparably dense with 24px horizontal panel padding.

## Elevation & Depth

Shadows are ambient at rest and only intensify in response to hover or modal/overlay state — never decorative on a static surface. Every shadow color carries a tint of the brand navy (`rgba(10, 27, 115, ...)` or `rgba(15, 35, 70, ...)`) rather than neutral black, so depth reads as part of the same blue system rather than a generic drop-shadow. Dark mode keeps the same shadow shapes but shifts to true black-based rgba, since a navy-tinted shadow would nearly disappear against the dark canvas.

### Shadow Vocabulary
- **Card** (`--as-shadow-card`: `0 8px 24px -4px rgba(10, 27, 115, 0.12)`; dark: `0 8px 24px rgba(0, 0, 0, 0.45)`): Default resting shadow under panels and content cards.
- **Card Hover** (`--as-shadow-card-hover`: `0 12px 30px rgba(15, 35, 70, 0.12)`; dark: `rgba(0, 0, 0, 0.55)`): Interactive card lift on hover.
- **Small** (`--as-shadow-sm`: `0 4px 12px -8px rgba(23, 74, 150, 0.75)`; dark: `rgba(0, 0, 0, 0.6)`): Tighter, structural shadow for sub-panels and compact controls.
- **Overlay** (`--as-shadow-overlay`: `0 20px 44px -20px rgba(15, 35, 70, 0.55)`; dark: `rgba(0, 0, 0, 0.7)`): Modals, drawers, dropdowns.
- **Deep** (`--as-shadow-deep`: `0 18px 30px -22px rgba(7, 28, 68, 0.82)`; dark: `rgba(0, 0, 0, 0.8)`): Auth card, reader-mock components — maximum presence.

### Named Rules

**The Tinted Shadow Rule.** Shadows in light mode are always navy-tinted rgba (`rgba(10, 27, 115, ...)` / `rgba(15, 35, 70, ...)`), never neutral black. Dark mode is the one deliberate exception — shadows there go to true black because a navy tint has no contrast against a navy canvas.

**The State-Responsive Shadow Rule.** Shadow intensity increases only in response to hover or modal/overlay state. A resting surface's shadow is ambient and unchanging; don't add a hover-strength shadow to something at rest.

## Shapes

Softly institutional: large radii at the structural level, pill shapes for every interactive identifier.

- **Content Card / Dashboard Header / Modal:** `border-radius: 28px` — the system's signature silhouette.
- **Panel (`pf-panel`) / Sidebar:** `border-radius: 24px` — subsections and the shell sidebar itself.
- **Field / Input (`pf-field input`):** `border-radius: 12px`.
- **Button / Badge / Pill / Chip:** `border-radius: 999px` — fully rounded, no exceptions.

**The No-Hard-Corner Rule.** No visible component uses `border-radius: 0` or a value below 12px. Controlled softness at every level is what keeps the system from reading as either sterile (hard corners) or unfinished.

## Components

### Buttons

**Character:** Pill-shaped, glass-shimmer on gradient buttons, tactile press on every variant (`scale(0.97)` active).

- **Shape:** `border-radius: 999px`, `height: 42px`, `padding: 0 20px`, `font-size: 13px`, `font-weight: 600`.
- **Primary (`pf-btn-primary`):** Royal-blue gradient (`linear-gradient(180deg, #5b7cee 0%, #3e66ea 50%, #2247cc 100%)`), white text, inset highlight + diffuse blue glow shadow. One primary action per panel.
- **Secondary (`pf-btn-secondary`):** Translucent white glass (`rgba(255,255,255,0.8)`, `backdrop-filter: blur(8px)`) with a subtle top-sheen `::before`, navy text. In dark mode: `rgba(19,28,46,0.82)` glass with light text — a parallel glass treatment, not a flat solid swap.
- **Danger (`pf-btn-danger`):** Red gradient (`#f43f5e → #dc2626 → #991b1b`), same glass-shimmer treatment as primary. Reserved for irreversible destructive actions.
- **Hover:** `translateY(-1px)` + `brightness(1.04–1.06)` on primary/danger; background/border shift on secondary.
- **Focus:** `box-shadow: 0 0 0 2px {surface}, 0 0 0 4px {brand-blue}` — a two-ring halo, not a browser-default outline.

### Cards / Panels (`pf-panel`)

- **Corner Style:** `border-radius: 24px` (panel), `28px` (dashboard header / outer card / modal).
- **Background:** `--as-surface` with `1px solid --as-border`.
- **Shadow Strategy:** `--as-shadow-card` at rest, `--as-shadow-card-hover` on hover.
- **Internal Padding:** 24px standard.

### Inputs / Fields (`pf-field`)

- **Style:** `1px solid --as-border`, `border-radius: 12px`, `background: --as-surface`, `height: 44px`, `padding: 0 14px`, `font-size: 13px`.
- **Focus:** Border shifts to brand blue, `box-shadow: 0 0 0 4px rgba(35, 78, 244, 0.12)` (dark: `0.25` alpha).
- **Label:** 11px/700/uppercase/tracked (`letter-spacing: 0.08em`), `color: --as-text-navy`.
- **Placeholder:** `--as-text-muted`.

### Navigation (Shell + Sidebar)

- **Sidebar:** Sticky glass panel (`rgba(255,255,255,0.94)`, `backdrop-filter: blur(20px) saturate(180%)`), `border-radius: 24px`, 260px wide (76px collapsed).
- **Nav Links:** Pill-shaped, `color: --as-text-secondary` at rest.
- **Active Link:** Solid royal-blue pill (`--as-sidebar-link-active-bg`), white text — a "solid badge" that stays vivid in both themes.
- **Topbar:** Frosted glass (`--as-topbar-bg`, `backdrop-filter: blur(12px)`), `border-bottom: 1px solid --as-topbar-border`.
- **Mobile:** Slide-in drawer (`translateX`), dark scrim overlay with blur.

### Status Badges / Pills

- **Style:** Pill (`border-radius: 999px`), `font-size: 11–12px`, `font-weight: 700`, uppercase or capitalize per context.
- **Colors:** Green / Amber / Crimson / Harbor-Info per the Status palette above. Dark-mode backgrounds are always translucent rgba, never a carried-over solid pastel (see The Translucent Dark Rule).

### Modals (`Modal.tsx` + `pf-modal-*`)

- **Shape:** `border-radius: 28px` (matches the content-card radius, not a tighter one), `background: #ffffff` / `dark:bg-[var(--as-surface)]`, `border: 1px solid #e2e8f0` / `dark:border-[var(--as-border)]`.
- **Header (`ModalHero`):** Tinted icon chip (solid-badge exception) + title (`--as-brand-dark`) + subtitle (`--as-text-secondary`), close button (`--as-surface` / `--as-text-secondary`, hover `--as-surface-hover` / `--as-text-slate`).
- **Overlay:** `bg-[#0f172a]/45` with `backdrop-blur-[6px]` (dark: `bg-[#020617]/60`).

## Do's and Don'ts

### Do:
- **Do** use `pf-btn-primary` for one primary action per panel.
- **Do** use the `--as-*` CSS custom properties for anything color-related; never hard-code a hex value that duplicates a token — and never redeclare the same property with a hardcoded literal after the token version in the same rule (this exact pattern caused most of the dark-mode regressions found in this codebase).
- **Do** gate any dark-mode-specific style behind the `.dark` class (`:root.dark .selector`), never `@media (prefers-color-scheme: dark)` — the manual toggle is the only source of truth.
- **Do** use `border-radius: 999px` for all buttons, nav links, badges, and pills.
- **Do** keep saturated status color reserved for actual status communication.
- **Do** tint shadows with brand navy (`rgba(10, 27, 115, ...)`) in light mode; switch to true-black rgba only in dark mode.

### Don't:
- **Don't** use `border-radius` below `12px` on any visible component.
- **Don't** introduce a new accent color outside the royal-blue + status palette without an explicit design decision.
- **Don't** carry a light-mode pastel status/chip background into dark mode unchanged — translucent-ize it (see The Translucent Dark Rule).
- **Don't** use the `PrimaryButton`/`SecondaryButton` Tailwind components from `resources/js/Components/` in portal screens — use `pf-btn pf-btn-primary`/`pf-btn-secondary` from `platform-dashboard.css`. Those Tailwind components exist only for the legacy auth flow.
- **Don't** place status color on decorative elements, headings, or link text — status color means "the system is reporting something."
- **Don't** skip the `pf-modal-header`/`ModalHero` structure in modal forms.
