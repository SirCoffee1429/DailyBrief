# FOH Sidebar Layout + Cyan Theme Fix — Design

**Date:** 2026-07-12
**Status:** Approved (design), ready for implementation plan
**Type:** feature + fix (UI shell / routing / CSS)

## Goal

Make the Front of House (FOH) shell look and run like the Back of House
(Kitchen) shell: replace the floating bottom tab bar with the office-style
**left sidebar**, and fix the FOH color theme so it is fully cyan (the current
theme leaves the active nav state stuck on the office shell's hardcoded orange).

## Background

- The kitchen shell (`KitchenLayout.jsx`) was recently converted from a bottom
  tab bar to a left sidebar by reusing the office-v2 structural classes with a
  `.kitchen-v2` modifier (`office-v2-container kitchen-v2`).
- The FOH shell (`FOHLayout.jsx`) still uses the old `.app-shell foh-theme` +
  `.bottom-tab-bar` structure.
- `.app-shell.foh-theme` sets **both** `--accent` and `--orange` to cyan
  (`#06b6d4`), so FOH content is already cyan. However, the office sidebar's
  nav states are **hardcoded orange** (`index.css` `.office-v2-nav-link.active`
  → `rgba(230,107,53,0.2)` / `#e66b35`) and the hover state has **no glow**
  (grey background only). Moving FOH onto the office sidebar would surface that
  orange and the missing cyan glow — this is the "needs to be fixed" part.

## Scope

**In scope**
- FOH sidebar with nav: **Brief · Events · Recipes** + **Assistant** (bottom).
- Fully cyan FOH theme, **no orange anywhere**.
- Hover over any section (sidebar nav item and dashboard card) → **cyan outline
  + cyan glow aura**.
- Active sidebar item → cyan (overriding the inherited orange).

**Explicitly out of scope** (owner decisions during brainstorm)
- Schedule, Availability, Time Off tabs on FOH — dropped for now.
- Sales on FOH — dropped (stays sales-free).
- The old FOH "Tasks" tab (which opened the AI knowledge-base chat) — removed.
- Any change to the `FOHDashboard` page itself — it already mirrors the kitchen
  dashboard and is correctly sales-free.
- No data model / backend / edge function changes.

## Design

Approach: **new `.foh-v2` modifier mirroring `.kitchen-v2`**, folding the cyan
accent (currently in `.app-shell.foh-theme`) into it and adding FOH-specific
cyan overrides for the sidebar nav states. This is a direct parallel to how the
kitchen shell was built.

### 1. `FOHLayout.jsx` (rewrite, mirror `KitchenLayout.jsx`)
- Root container: `office-v2-container foh-v2`.
- Sidebar (`office-v2-sidebar`) with header title **"Front of House"**, mobile
  hamburger toggle, and overlay-to-close on mobile.
- `navItems`:
  - `{ to: '/foh', label: 'Brief', icon: 'fa-solid fa-table-cells-large', end: true }`
  - `{ to: '/foh/events', label: 'Events', icon: 'fa-solid fa-champagne-glasses' }`
  - `{ to: '/foh/recipes', label: 'Recipes', icon: 'fa-solid fa-utensils' }`
- Assistant button at the bottom of the nav — same long-press-for-voice
  behavior as kitchen/office, but its **inline active colors changed from
  orange (`rgba(230,107,53,0.2)` / `#e66b35`) to cyan** (`rgba(6,182,212,0.2)`
  / `#06b6d4`).
- Main area reuses the scroll wrapper + `.main-content` pattern (via
  `.foh-v2-scroll`).
- Removes: the bottom tab bar and the Tasks/chat link.
- Keeps: `AssistantWidget` and the long-press handlers unchanged.

### 2. `index.css` (new `.foh-v2` block, parallel to `.kitchen-v2`)
- `.office-v2-container.foh-v2` — cyan accent variables (folded from
  `.app-shell.foh-theme`): `--accent`, `--accent-hover`, `--accent-glow`,
  `--accent-subtle`, `--orange`, `--orange-bg` (all cyan) + background surfaces
  mirroring `.kitchen-v2`.
- `.foh-v2 .office-v2-nav-link:hover` → cyan outline + cyan glow aura
  (`box-shadow`), replacing the grey-only office hover.
- `.foh-v2 .office-v2-nav-link.active` (and `.active .office-v2-nav-icon`) →
  cyan background / text / left-border, overriding the hardcoded orange.
- `.foh-v2 .dash-card:hover` → cyan outline + glow (carried from `foh-theme`).
- `.foh-v2-scroll` and `.foh-v2 .office-v2-hamburger-mobile` spacing (mirror the
  `.kitchen-v2` equivalents).
- **Delete** the now-orphaned `.app-shell.foh-theme` rules (the whole
  bottom-tab FOH theme block, including the `.btn-orange` and `.dash-card:hover`
  retargets, which move into `.foh-v2`).

### 3. `App.jsx`
- Remove the `/foh/chat` route (unreachable once the Tasks tab is gone).
- `AiChat` import stays (still used by `/kitchen/chat`).
- All other `/foh/*` routes (`/foh`, `/foh/events`, `/foh/recipes`,
  `/foh/recipes/:id`) are kept.

## Data flow / interfaces

No data or backend changes. FOH pages (`FOHDashboard`, `KitchenRecipes`,
`EventsBanquetsPage`) already render inside `.main-content` and work unchanged
under the office-v2 sidebar structure, exactly as the kitchen pages do.

## Verification

- Clean production build (`npm run build`).
- Visual check on `/foh`:
  - Left sidebar renders with Brief · Events · Recipes · Assistant.
  - No bottom tab bar.
  - Hovering a nav item and a dashboard card shows a **cyan outline + cyan
    glow**.
  - The active nav item is **cyan** (not orange).
  - Nothing on the FOH side renders orange.
  - Mobile: hamburger opens/closes the sidebar; overlay closes it.
- `/foh/chat` no longer routes (removed); `/kitchen/chat` still works.

## Open questions

None — all resolved during brainstorm.
