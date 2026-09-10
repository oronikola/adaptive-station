---
name: Adaptive Station
description: Offline-first school RFID attendance system — quiet, operational, trustworthy.
colors:
  brand-dark: "#0f172a"
  brand: "#1e293b"
  brand-mid: "#334155"
  brand-muted: "#475569"
  brand-light: "#64748b"
  surface-bg: "#f4f6f9"
  surface: "#ffffff"
  surface-hover: "#f8fafc"
  surface-active: "#f1f5f9"
  border: "#e2e8f0"
  border-mid: "#cbd5e1"
  text-primary: "#0f172a"
  text-body: "#334155"
  text-secondary: "#64748b"
  text-muted: "#94a3b8"
  success: "#1a8a4c"
  success-bg: "#e3f6ea"
  warning: "#c1791f"
  warning-bg: "#fdf1e0"
  danger: "#dc2626"
  danger-bg: "#fef2f2"
  info: "#475569"
  info-bg: "#f1f5f9"
  danger-border: "#fecaca"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.03
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.10em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  pill: "999px"
  card: "24px"
  panel: "20px"
  input: "16px"
  chip: "999px"
  badge: "999px"
  sm: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "linear-gradient(180deg, {colors.brand-light} 0%, {colors.brand-muted} 50%, {colors.brand-mid} 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "linear-gradient(180deg, {colors.brand-light} 0%, {colors.brand-muted} 50%, {colors.brand-mid} 100%) + brightness(1.08)"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.85)"
    textColor: "{colors.text-body}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-danger:
    backgroundColor: "linear-gradient(180deg, #ef4444 0%, {colors.danger} 50%, {colors.danger} 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
---

# Design System: Adaptive Station

## Overview

**Creative North Star: "The Granite Ledger"**

Adaptive Station's visual language is institutional and earned — a slate-and-white system that communicates permanence, precision, and low ceremony. The shell is a deep slate gradient (slate-900 to slate-700: `#0f172a → #1e293b → #334155`), giving the interface architectural weight without vibration. White content cards with large radii float inside this shell with visible breathing room, creating a clear signal hierarchy: chrome lives in the dark; work lives in the white.

Every decision optimises for the daily operator: the school registrar who opens the portal at 7 AM and works through the same eight flows every day. Nothing in the system bids for attention unless it has news to deliver. Colour is reserved for status (green, amber, red) and confirmation (gradient primary buttons). At rest, the interface is almost achromatic — slate text on white card — and only state and status are coloured.

The tactile press animation (subtle `scale(0.97)` on active) and glass shimmer on buttons give the system its one indulgence: a sense that every button click has physical weight. Everything else is restrained.

**Key Characteristics:**
- Deep slate shell with floating white content cards
- Status-only colour; palette is near-achromatic at rest
- Plus Jakarta Sans throughout — geometric, contemporary, optimistic
- Glass shimmer on dark-background buttons; flat/bordered on light surfaces
- Tactile press on every interactive element
- Pill navigation links; pill badges; soft-radius inputs and panels

## Colors

The palette is near-achromatic. Slate fills the shell and anchors the brand; white and off-white hold all content surfaces. Status colours are the only saturated hues, appearing only when the system has something to communicate.

### Primary (Shell & Brand)

- **Abyss** (`#0f172a`): The darkest shell tone. Used as the deepest gradient stop of the sidebar background and the near-black text on content cards (`--as-brand-dark`, `--as-text`).
- **Gunmetal** (`#1e293b`): The middle shell tone and primary brand identity colour. Sidebar background anchor, active nav text, and the primary text-navy role (`--as-brand`, `--as-text-navy`).
- **Slate Deck** (`#334155`): The lightest shell gradient stop. Also the secondary brand presence: body text, text-brand, page headings inside content (`--as-brand-mid`, `--as-text-body`, `--as-text-brand`).

### Secondary (Surface Brand)

- **Steel** (`#475569`): Mid-weight slate. Used for the info status badge, `--as-info`, and secondary content text where a darker but non-primary weight is needed.
- **Ash** (`#64748b`): Lightest brand tone, used for secondary text and the gradient top-stop of primary buttons (`--as-brand-blue-light`, `--as-text-secondary`).

### Neutral

- **Canvas** (`#f4f6f9`): Page background — a barely-warm white to distinguish the shell from pure white content cards.
- **White** (`#ffffff`): Content card surfaces, topbar, modals, form panels.
- **Smoke** (`#f8fafc`, `#f1f5f9`): Hover and active surface states.
- **Hairline** (`#e2e8f0`): Default border colour — card edges, input outlines.
- **Rule** (`#cbd5e1`): Mid-weight border for dividers, active field rings, table separators.
- **Ink** (`#0f172a`): Primary text — headings, key values.
- **Graphite** (`#334155`): Body text default.
- **Pewter** (`#64748b`): Secondary/label text.
- **Fog** (`#94a3b8`): Muted/placeholder text.

### Status (Saturated; context-only)

- **Emerald** (`#1a8a4c`, bg `#e3f6ea`): Success, presence, confirmed attendance.
- **Amber** (`#c1791f`, bg `#fdf1e0`): Warning, pending, import errors needing review.
- **Crimson** (`#dc2626`, bg `#fef2f2`): Danger, destructive actions, deactivated states.
- **Steel-Info** (`#475569`, bg `#f1f5f9`): Neutral info badge — appears in place of a fourth colour to avoid hue proliferation.

### Named Rules

**The Status-Only Colour Rule.** Saturated hue (green, amber, red) appears only when the system is communicating state — success, warning, error, deactivation. Never use a status colour decoratively. At rest, the interface is slate and white.

**The One Brand Rule.** The slate gradient lives in the shell. Inside content cards, brand presence is reduced to text weights and subtle borders — never a blue or tinted background, never a brand-coloured CTA that isn't the primary action.

## Typography

**Display Font:** Plus Jakarta Sans (geometric sans, fallback: ui-sans-serif, system-ui)
**Body Font:** Plus Jakarta Sans (same family throughout)
**Mono Font:** ui-monospace, SFMono-Regular, Menlo (integration keys, API tokens)

**Character:** Plus Jakarta Sans is geometric and contemporary with a slight warmth — it reads as institutional without feeling bureaucratic. A single-family stack simplifies the system and lets weight and letter-spacing carry the entire hierarchy.

### Hierarchy

- **Display** (700, `clamp(2rem, 5vw, 3.5rem)`, line-height 1.03, `letter-spacing: -0.045em`): Auth page hero headlines and landing page section headlines. Tight tracking for maximum visual compression at large scale.
- **Headline** (700, `22px`, line-height 1.2, `letter-spacing: -0.02em`): Page-level headings inside content cards (e.g. "People", "RFID Cards", "Stations").
- **Title** (700, `15px`, line-height 1.3): Section titles within panels, modal headings, panel headers.
- **Body** (400/500, `13px`, line-height 1.5): All paragraph text, table cells, form fields, descriptions.
- **Label** (700, `11px`, `letter-spacing: 0.10em`, uppercase): Column headers, pill eyebrows, status tags, nav eyebrow text. The tight tracking compensates for the small size.
- **Mono** (400, `11px`, ui-monospace): API keys, integration tokens, import keys. Never used for general UI text.

### Named Rules

**The Weight Hierarchy Rule.** 700 for structural elements (headings, labels, buttons), 600 for supporting data (sub-labels, stats), 400/500 for reading text. Never use 300 or lighter anywhere in the portal — the interface's institutional character depends on confident weight.

**The Tight-Tracking Display Rule.** `letter-spacing: -0.04em` or tighter only above 20px. Below that, tracking stays neutral or slightly positive (labels). Never apply negative tracking to body or label sizes.

## Layout

The shell is a full-viewport dark slate gradient. Inside it, a frosted-glass topbar (100% width, `bg-white/90`, `backdrop-blur`) is fixed at the top. The sidebar sits flush on the left inside the shell; its width collapses to icon-only state on medium viewports and disappears behind a modal drawer on mobile.

The content area is a rounded white card (`border-radius: 28px`) pinned to the right and vertical edges of the shell, with a fixed gap from the sidebar (typically 16–24px margin). This card is the primary "work surface" and houses all page content. Its inner rhythm uses 24–32px padding on the top/sides and 16px between internal sections.

**Grid:** No fixed column grid. Layout is vertical stacking of `pf-panel` containers or CSS grid within individual panels where needed (e.g. stat cards in 3–4 columns). Responsive breakpoints follow Tailwind's defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px).

**Density:** Medium-tight. Table rows sit at 44–48px effective height. Form fields use 14px vertical padding. The system is designed for a desktop operator in an office browser — not a mobile-first product.

## Elevation & Depth

The system uses a hybrid model: a dark physical shell (colour creates depth) with layered card surfaces inside. Shadows are ambient and structural, never decorative.

### Shadow Vocabulary

- **Shell / Card Overlay** (`0 8px 24px rgba(15,35,70,0.08)`): Default content card resting shadow — barely perceptible against the dark shell; confirms the card sits above it.
- **Card Hover** (`0 12px 30px rgba(15,35,70,0.12)`): Applied on interactive card elements on hover to signal lift.
- **Panel Shadow** (`0 4px 12px -8px rgba(23,74,150,0.75)`): Tighter, more structural — used under form panels and sub-panels for internal depth without spreading.
- **Overlay / Modal** (`0 20px 44px -20px rgba(15,35,70,0.55)`): Deep, focused shadow under modals and drawers — scrimmed by a dark overlay.
- **Deep / Auth Card** (`0 18px 30px -22px rgba(7,28,68,0.82)`): Used under the login card and reader mock components for maximum presence.
- **Button Glass Glow**: Primary buttons carry `0 8px 20px -8px rgba(71,85,105,0.45)` — a diffuse halo that echoes the shell colour.

### Named Rules

**The Depth By Shell Rule.** The shell's dark colour creates the primary depth illusion — content cards appear elevated simply by contrast. Shadows reinforce structure, not height. Never add a shadow to an element that already has the shell as context.

**The State-Responsive Shadow Rule.** Shadows increase only in response to hover or modal state. Resting surfaces are flat or near-flat. Shadow ≠ decoration.

## Shapes

The form language is **softly institutional** — large radii at the structural level, moderate at the component level, pills for interactive identifiers.

- **Shell / Topbar / Sidebar**: No visible corners; full-bleed or clipped by viewport.
- **Content Card (main frame)**: `border-radius: 28px` — the signature silhouette of the portal. Large enough to read as a "floating card" rather than a box.
- **Panel / pf-panel**: `border-radius: 24px` — subsections within the content card, e.g. filter area, detail sections.
- **Modal / pf-modal**: `border-radius: 20px` — overlaid panels slightly tighter than the main card.
- **Sub-panel / form section**: `border-radius: 14–16px` — nested content areas inside panels.
- **Input / pf-field**: `border-radius: 16px` — noticeably rounded inputs. Flat bottom treatment is not used.
- **Badge / Status Pill**: `border-radius: 999px` — fully rounded for status labels and nav active indicators.
- **Button / pf-btn**: `border-radius: 999px` — all buttons are fully pill-shaped.

**The No-Hard-Corner Rule.** No element in the authenticated portal uses `border-radius: 0` or `border-radius: 4px`. The system's institutional character comes from controlled softness at all levels; squared corners would read as unfinished or aggressive.

## Components

### Buttons

**Character:** Pill-shaped, glass-shimmer on dark surfaces, bordered glass on light surfaces. Every button has tactile press (`transform: scale(0.97)` on active). Loading state uses opacity and cursor change.

- **Shape:** Fully pill (`border-radius: 999px`), `font-size: 13px`, `font-weight: 600`, `padding: ~10px 20px`.
- **Primary (`pf-btn-primary`):** Slate gradient `linear-gradient(180deg, #64748b 0%, #475569 50%, #334155 100%)`, white text, glass shimmer overlay (`::before` with `rgba(255,255,255,0.28→0)` gradient), inset highlights, diffuse glow shadow. Used for the single primary action per form.
- **Secondary (`pf-btn-secondary`):** White glass with border `rgba(226,232,240,0.9)`, inset white sheen, slate text. Used for cancel, navigate-back actions.
- **Danger (`pf-btn-danger`):** Red gradient, same glass shimmer treatment as primary. Reserved for irreversible destructive actions (deactivate, delete, revoke).
- **Loading state (`pf-btn--loading`):** `opacity: 0.58`, `cursor: not-allowed`, pointer-events: none. Applied during form submission.
- **Hover:** `translateY(-1px)` + `brightness(1.06)` on primary/danger; `translateY(-1px)` + brightness shift on secondary.
- **Focus:** `focus:ring-2 focus:ring-offset-2` with brand or danger ring colour.

### Cards / Containers (`pf-panel`)

- **Corner Style:** `border-radius: 24px` (panel), `28px` (outer page card).
- **Background:** `#ffffff` with `border: 1px solid #e2e8f0`.
- **Shadow Strategy:** Ambient `0 8px 24px rgba(15,35,70,0.08)` at rest.
- **Internal Padding:** `24px` standard; `32px` for hero/detail panels.

### Inputs / Fields (`pf-field`)

- **Style:** `border: 1px solid #e2e8f0`, `border-radius: 16px`, `background: #ffffff`, `padding: 14px 16px`, `font-size: 13px`.
- **Focus:** Border shifts to `#cbd5e1`; `box-shadow: 0 0 0 4px rgba(71,85,105,0.11)` — a subtle slate ring, not an electric glow.
- **Error:** Border `#dc2626`; focus ring `rgba(220,38,38,0.10)`.
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`.
- **Label:** 11px/700/uppercase/tracked, `color: #334155`, `margin-bottom: 8px`.

### Navigation (Shell + Sidebar)

- **Sidebar Shell:** Full-height dark slate gradient (`linear-gradient(145deg, #0f172a 0%, #1e293b 42%, #334155 100%)`) with multi-layer radial overlays in neutral slate (no colour).
- **Nav Links:** Pill-shaped (`border-radius: 999px`), `color: rgba(255,255,255,0.70)`, `font-size: 13px`, `font-weight: 600`.
- **Active Link:** White pill background, `color: #1e293b` (gunmetal), `box-shadow: inset` depth ring, active-state badge.
- **Icon-only collapse:** Sidebar collapses to icon strip on medium viewports; full labels on desktop.
- **Mobile:** Slide-in drawer with translucent slate overlay.
- **Topbar:** Frosted glass (`background: rgba(255,255,255,0.90)`, `backdrop-filter: blur(12px)`), `border-bottom: 1px solid #e2e8f0`.

### Status Badges

- **Style:** Pill (`border-radius: 999px`), `font-size: 11px`, `font-weight: 700`, `letter-spacing: 0.08em`, uppercase.
- **Colours:** Green (`color: #1a8a4c`, `background: #e3f6ea`) / Amber (`color: #c1791f`, `background: #fdf1e0`) / Crimson (`color: #dc2626`, `background: #fef2f2`) / Steel-Info (`color: #475569`, `background: #f1f5f9`).
- **Usage:** Present on every table row and detail screen; width fits content.

### Modals (`pf-modal`)

- **Shape:** `border-radius: 20px`, `background: #ffffff`, `border: 1px solid #e2e8f0`.
- **Overlay:** Dark scrim `rgba(0,0,0,0.45)`, centred.
- **Header (`pf-modal-header`):** Icon + title row, `border-bottom: 1px solid #e2e8f0`, `padding: 20px 24px`.
- **Body:** `padding: 20px 24px`.
- **Footer:** `padding: 12px 24px 20px`, right-aligned actions; danger button right, secondary button left.

## Do's and Don'ts

### Do:
- **Do** use `pf-btn-primary` for one primary action per panel. Every screen has a single clear action; duplicating primaries dilutes the hierarchy.
- **Do** apply `pf-btn--loading` class during async operations — every form submission must enter a loading state with `disabled` on the button.
- **Do** use the `--as-*` CSS custom properties when adding new components; never hard-code hex values that duplicate a token.
- **Do** use `border-radius: 999px` for all buttons, nav links, and badges — pill shape is the system's identity.
- **Do** keep saturated colour for status only. A new UI element that is "not a status indicator" should use slate tones, not a semantic colour.
- **Do** pair glass shimmer (`::before` gradient overlay) with dark-background buttons only (primary, danger). Secondary buttons on white surfaces use bordered glass, not shimmer.

### Don't:
- **Don't** use `border-radius: 0` or values below `8px` on any visible component. Hard corners break the system's softness contract.
- **Don't** introduce a new brand colour outside the slate-900 → slate-500 ramp without explicit design decision. The palette is intentionally near-achromatic.
- **Don't** add a shadow to a panel or card that is already sitting inside the dark shell — the shell provides the context. Reserve shadows for hover state or overlay components.
- **Don't** use the `PrimaryButton` or `SecondaryButton` Tailwind components from `resources/js/Components/` in portal screens. Use `pf-btn pf-btn-primary` from `platform-dashboard.css` — the Tailwind components exist only for legacy auth flows.
- **Don't** place status colour (green, amber, red) on decorative elements, headings, or link text. Status colour means "the system is telling you something"; using it decoratively causes false-positive alarm.
- **Don't** skip the `pf-modal-header` / `pf-modal-title` structure in modal forms. Modals that use `<form className="pf-modal">` as a layout wrapper misuse the class semantics — `pf-modal` wraps the overlay element, not the form.
