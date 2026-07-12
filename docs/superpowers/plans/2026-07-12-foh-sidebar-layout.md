# FOH Sidebar Layout + Cyan Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the FOH floating bottom tab bar with the office-style left sidebar (mirroring the kitchen shell) and make the FOH theme fully cyan — including the currently-orange active nav state and a cyan hover glow.

**Architecture:** Reuse the existing `office-v2` sidebar structural classes with a new `.foh-v2` modifier (a direct parallel to the existing `.kitchen-v2` modifier). `FOHLayout.jsx` is rewritten to mirror `KitchenLayout.jsx`. The cyan palette moves out of the old `.app-shell.foh-theme` block into `.foh-v2`, plus FOH-specific overrides make the sidebar nav hover/active cyan. The dead `/foh/chat` route and the orphaned `.app-shell.foh-theme` CSS are removed.

**Tech Stack:** React 19 + Vite, React Router v7, plain CSS (`app/src/index.css`), Font Awesome icon classes.

## Global Constraints

- **No test runner exists for components in this repo.** Verification for every task is a clean `npm run build` (run from `app/`) plus the stated visual check — this matches how every change in this codebase is verified. Do NOT add a Jest/RTL/Vitest suite (YAGNI, out of scope).
- FOH is **fully cyan, no orange anywhere.** Cyan value: `#06b6d4`; hover `#0891b2`.
- No data model, backend, or edge function changes.
- Match existing code style in each file (2-space indent in JSX/CSS as present; existing quote style).
- Keep the app working after every commit (task ordering below guarantees this).

---

### Task 1: Add the `.foh-v2` CSS modifier (additive)

Add the new FOH sidebar theme block. This is purely additive — `FOHLayout.jsx` still uses `.app-shell foh-theme` at this point, so nothing changes visually yet and the app keeps working.

**Files:**
- Modify: `app/src/index.css` (append a new block immediately after the `.kitchen-v2` section, which ends around line 5859 — just before the `.kitchen-brief-grid` comment)

**Interfaces:**
- Consumes: existing `office-v2-*` structural classes (`.office-v2-container`, `.office-v2-sidebar`, `.office-v2-nav-link`, `.office-v2-nav-icon`, `.office-v2-hamburger-mobile`) and `.dash-card`, `.btn-orange`, `.main-content`.
- Produces: `.foh-v2` container modifier + `.foh-v2-scroll` scroll wrapper class, consumed by `FOHLayout.jsx` in Task 2.

- [ ] **Step 1: Add the `.foh-v2` block**

Insert the following immediately after the `.kitchen-v2 .office-v2-hamburger-mobile { ... }` rule (around line 5859 in `app/src/index.css`), before the `/* Briefing + Tasks two-column grid ... */` comment:

```css
/* ============================================
   FOH Sidebar Layout (foh-v2)
   ============================================
   The FOH shell reuses the office-v2 structural classes for the sidebar/main
   split (parallel to .kitchen-v2). This modifier applies the all-cyan FOH
   palette — accent, nav hover (outlined + glowing cyan aura), and active
   state — with no orange, and swaps surfaces to the dark palette. */
.office-v2-container.foh-v2 {
  /* Cyan is the whole FOH palette — no orange anywhere. */
  --accent: #06b6d4;
  --accent-hover: #0891b2;
  --accent-glow: rgba(6, 182, 212, 0.3);
  --accent-subtle: rgba(6, 182, 212, 0.08);
  --orange: #06b6d4;
  --orange-bg: rgba(6, 182, 212, 0.12);
  background-color: #0f1014;
  background-image: radial-gradient(circle at top left, #1c1917 0%, #0f1014 40%);
}

/* No office grid-pattern overlay (matches kitchen) */
.office-v2-container.foh-v2::before {
  display: none;
}

.foh-v2 .office-v2-sidebar {
  background-color: #18181b;
  border-right: 1px solid #27272a;
}

.foh-v2 .office-v2-sidebar-header {
  border-bottom: 1px solid #27272a;
}

/* Section hover — cyan outline + glowing cyan aura (replaces the office
   shell's grey-only nav hover). */
.foh-v2 .office-v2-nav-link:hover {
  background-color: rgba(6, 182, 212, 0.08);
  color: #fff;
  border-left-color: #06b6d4;
  box-shadow: 0 0 0 1px rgba(6, 182, 212, 0.4), 0 0 16px rgba(6, 182, 212, 0.25);
}

/* Active nav item — cyan (overrides the office shell's hardcoded orange). */
.foh-v2 .office-v2-nav-link.active {
  background-color: rgba(6, 182, 212, 0.2);
  color: #06b6d4;
  border-left-color: #06b6d4;
}

.foh-v2 .office-v2-nav-link.active .office-v2-nav-icon {
  color: #06b6d4;
}

/* Dashboard card hover — cyan outline + glow (carried from the old foh-theme). */
.foh-v2 .dash-card:hover {
  box-shadow: 0 0 0 1px rgba(6, 182, 212, 0.4), 0 8px 24px rgba(6, 182, 212, 0.2);
  border-color: rgba(6, 182, 212, 0.35);
}

/* btn-orange has an explicit background that ignores --accent, so retarget it
   to cyan inside the FOH shell (carried from the old foh-theme). */
.foh-v2 .btn-orange {
  background: var(--accent);
  color: #ffffff;
}
.foh-v2 .btn-orange:hover {
  background: var(--accent-hover);
}

/* Scroll wrapper inside the FOH main area — pages keep their centered
   max-width styling via .main-content (mirrors .kitchen-v2-scroll). */
.foh-v2-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Mobile hamburger spacing (mirrors kitchen). */
.foh-v2 .office-v2-hamburger-mobile {
  margin: 0.75rem 0 0 0.75rem;
}
```

- [ ] **Step 2: Verify the build is clean**

Run (from `app/`): `npm run build`
Expected: `✓ built in ...` with no errors (the pre-existing "chunks larger than 500 kB" warning is fine).

- [ ] **Step 3: Commit**

```bash
git add app/src/index.css
git commit -m "feat: add foh-v2 cyan sidebar theme (additive)"
```

---

### Task 2: Rewrite `FOHLayout.jsx` to the sidebar shell

Swap the FOH shell from the bottom tab bar to the office-v2 sidebar using the `.foh-v2` modifier from Task 1. This is the task where the visible change happens.

**Files:**
- Modify: `app/src/components/FOHLayout.jsx` (full rewrite of the returned JSX + add sidebar state; keep the existing long-press handlers)

**Interfaces:**
- Consumes: `.foh-v2`, `.foh-v2-scroll` (Task 1); `AssistantWidget` (unchanged import).
- Produces: FOH routes now render inside `.office-v2-container.foh-v2 > .office-v2-main > .foh-v2-scroll > .main-content`. Nav links point to `/foh`, `/foh/events`, `/foh/recipes`.

- [ ] **Step 1: Replace the entire file contents**

Overwrite `app/src/components/FOHLayout.jsx` with:

```jsx
import { useState, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import AssistantWidget from './AssistantWidget.jsx'

// Front of House shell — office-style left sidebar layout (reuses the office-v2
// structural classes with a .foh-v2 modifier that applies the all-cyan FOH
// palette). Mirrors KitchenLayout; replaces the old floating bottom tab bar.
export default function FOHLayout({ children }) {
    const [assistantOpen, setAssistantOpen] = useState(false)
    const [voiceMode, setVoiceMode] = useState(false)
    const [longPressActive, setLongPressActive] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const longPressTimer = useRef(null)
    const didTriggerVoice = useRef(false)

    const closeSidebar = useCallback(() => setSidebarOpen(false), [])
    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])

    const handlePointerDown = useCallback(() => {
        didTriggerVoice.current = false
        setLongPressActive(true)
        longPressTimer.current = setTimeout(() => {
            didTriggerVoice.current = true
            setLongPressActive(false)
            setVoiceMode(true)
            setAssistantOpen(true)
        }, 1500)
    }, [])

    const handlePointerUp = useCallback(() => {
        clearTimeout(longPressTimer.current)
        setLongPressActive(false)
        if (!didTriggerVoice.current) {
            setAssistantOpen(prev => !prev)
        }
    }, [])

    const handlePointerLeave = useCallback(() => {
        clearTimeout(longPressTimer.current)
        setLongPressActive(false)
    }, [])

    const navItems = [
        { to: '/foh', label: 'Brief', icon: 'fa-solid fa-table-cells-large', end: true },
        { to: '/foh/events', label: 'Events', icon: 'fa-solid fa-champagne-glasses' },
        { to: '/foh/recipes', label: 'Recipes', icon: 'fa-solid fa-utensils' },
    ]

    return (
        <div className="office-v2-container foh-v2">
            {/* Sidebar */}
            <aside className={`office-v2-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
                <div className="office-v2-sidebar-header">
                    <button className="office-v2-nav-link" onClick={toggleSidebar} style={{ padding: '0', marginRight: '1rem', border: 'none' }}>
                        <i className="fa-solid fa-bars" />
                    </button>
                    <h1 className="office-v2-sidebar-title">Front of House</h1>
                </div>

                <nav className="office-v2-nav custom-scrollbar">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={closeSidebar}
                            className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}
                        >
                            <i className={`${item.icon} office-v2-nav-icon`} />
                            <span style={{ marginLeft: '0.75rem', fontWeight: 500 }}>{item.label}</span>
                        </NavLink>
                    ))}

                    {/* Assistant — bottom of nav, long-press for voice (cyan active state) */}
                    <div style={{ marginTop: 'auto', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                        <button
                            className={`office-v2-nav-link ${assistantOpen ? 'active' : ''}`}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: assistantOpen ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderRadius: '0.5rem'
                            }}
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onContextMenu={e => e.preventDefault()}
                        >
                            <i className={`fa-solid ${longPressActive ? 'fa-microphone' : 'fa-brain'} office-v2-nav-icon`} style={{ color: assistantOpen ? '#06b6d4' : '' }} />
                            <span style={{ marginLeft: '0.75rem', color: assistantOpen ? '#06b6d4' : '' }}>Assistant</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Overlay — closes sidebar when tapped on mobile */}
            {sidebarOpen && (
                <div className="office-v2-sidebar-overlay" onClick={closeSidebar} />
            )}

            {/* Main Wrapper */}
            <main className="office-v2-main">
                {/* Mobile-only hamburger to open sidebar */}
                <button className="office-v2-hamburger-mobile" onClick={toggleSidebar}>
                    <i className="fa-solid fa-bars" />
                </button>

                {/* Sub-routes inject here — main-content keeps FOH pages' centered
                    max-width page styling */}
                <div className="foh-v2-scroll custom-scrollbar">
                    <div className="main-content">
                        {children}
                    </div>
                </div>
            </main>

            <AssistantWidget
                externalOpen={assistantOpen}
                onExternalClose={() => { setAssistantOpen(false); setVoiceMode(false) }}
                voiceMode={voiceMode}
                onVoiceModeEnd={() => setVoiceMode(false)}
            />
        </div>
    )
}
```

- [ ] **Step 2: Verify the build is clean**

Run (from `app/`): `npm run build`
Expected: `✓ built in ...` with no errors.

- [ ] **Step 3: Visual check (dev server)**

Run (from `app/`): `npm run dev`, open `/foh` in the browser. Confirm:
- Left sidebar renders with **Brief · Events · Recipes** and **Assistant** at the bottom. No bottom tab bar.
- Hovering a nav item shows a **cyan outline + cyan glow**.
- Clicking a nav item makes the active item **cyan** (not orange).
- Clicking Brief/Events/Recipes navigates to the right page; each page renders inside the centered content area.
- Nothing in the FOH shell is orange.
- Narrow the window (mobile): the hamburger opens the sidebar; tapping the overlay closes it.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/FOHLayout.jsx
git commit -m "feat: convert FOH shell to office-style cyan sidebar"
```

---

### Task 3: Remove dead `/foh/chat` route and orphaned `foh-theme` CSS

With the sidebar in place, the Tasks/chat tab is gone and `.app-shell.foh-theme` is no longer referenced. Remove both (dead-code cleanup).

**Files:**
- Modify: `app/src/App.jsx` (remove the `/foh/chat` route line)
- Modify: `app/src/index.css` (delete the `.app-shell.foh-theme` block + its header comment, ~lines 4920–4951)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new. `AiChat` import in `App.jsx` remains (still used by `/kitchen/chat`).

- [ ] **Step 1: Remove the `/foh/chat` route**

In `app/src/App.jsx`, delete this line (in the Front of House routes group):

```jsx
            <Route path="/foh/chat" element={<FOHLayout><AiChat /></FOHLayout>} />
```

Leave the `import AiChat from './pages/AiChat.jsx'` line intact — it is still used by the `/kitchen/chat` route.

- [ ] **Step 2: Delete the orphaned `.app-shell.foh-theme` CSS**

In `app/src/index.css`, delete the entire FOH theme block — the header comment that begins with `Applied by <FOHLayout> on the app-shell root.` through the closing `}` of `.app-shell.foh-theme .dash-card:hover` (the comment opener `/*` above line 4923 through line 4951). After deletion, no `.app-shell.foh-theme` rules remain. Verify with:

Run: `grep -rn "foh-theme" app/src/`
Expected: **no matches** (the class is gone from both CSS and JSX).

- [ ] **Step 3: Verify the build is clean**

Run (from `app/`): `npm run build`
Expected: `✓ built in ...` with no errors.

- [ ] **Step 4: Visual re-check**

Reload `/foh` — confirm it still renders fully cyan (accent, buttons, hover glow) exactly as after Task 2 (proves nothing depended on the deleted `foh-theme` block). Navigate to `/foh/chat` directly and confirm it no longer matches a route (falls through). Confirm `/kitchen/chat` still works.

- [ ] **Step 5: Commit**

```bash
git add app/src/App.jsx app/src/index.css
git commit -m "refactor: remove dead /foh/chat route and orphaned foh-theme CSS"
```

---

### Task 4: Log the change

Per the project's always-on change-tracking rule, append a CHANGES.md entry.

**Files:**
- Modify: `C:\Old Hawthorne Projects\DailyBrief\CHANGES.md` (append one entry)

- [ ] **Step 1: Append the entry**

Add at the end of `CHANGES.md`:

```markdown
### 2026-07-12 — FOH Sidebar Layout + Cyan Theme Fix

**File(s) Changed:** `app/src/components/FOHLayout.jsx`, `app/src/index.css`,
`app/src/App.jsx`
**Type:** `feature` + `fix`
**Summary:** Converted the Front of House shell from the floating bottom tab bar to
the office-style left sidebar (mirrors KitchenLayout) and fixed the FOH theme to be
fully cyan — including a cyan hover glow and a cyan active nav state (previously the
office shell's hardcoded orange bled through).

**Details:**

- **`FOHLayout.jsx`:** rewritten to the `office-v2-container foh-v2` sidebar structure
  with nav Brief · Events · Recipes + Assistant (long-press voice). Bottom tab bar and
  the mislabeled Tasks→chat tab removed. Assistant active state uses cyan inline colors.
- **`index.css`:** new `.foh-v2` modifier (parallel to `.kitchen-v2`) with the all-cyan
  palette, a cyan nav hover (outline + glow), a cyan active nav state overriding the
  office shell's hardcoded orange, and a cyan dash-card hover. Deleted the orphaned
  `.app-shell.foh-theme` block.
- **`App.jsx`:** removed the now-unreachable `/foh/chat` route (AiChat import kept for
  `/kitchen/chat`).
- **Scope:** Schedule/Availability/Time Off/Sales deliberately left off FOH (owner
  decision). No data/backend changes.
- **Verification:** production build clean; visual check of sidebar, cyan hover/active,
  and mobile hamburger.
```

- [ ] **Step 2: Commit**

```bash
git add CHANGES.md
git commit -m "docs: log FOH sidebar layout + cyan theme change"
```

---

## Self-Review

**Spec coverage:**
- Sidebar with Brief · Events · Recipes + Assistant → Task 2 ✓
- Fully cyan, no orange → Task 1 (palette + nav overrides) + Task 2 (assistant inline cyan) + Task 3 (removes old orange-free-but-orphaned block) ✓
- Cyan hover outline + glow on nav and cards → Task 1 (`.foh-v2 .office-v2-nav-link:hover`, `.foh-v2 .dash-card:hover`) ✓
- Cyan active nav overriding hardcoded orange → Task 1 (`.foh-v2 .office-v2-nav-link.active`) ✓
- Remove Tasks/chat tab → Task 2 (nav) + Task 3 (route) ✓
- FOHDashboard unchanged → not touched by any task ✓
- Delete orphaned `.app-shell.foh-theme` → Task 3 ✓
- No data/backend changes → confirmed, no such tasks ✓

**Placeholder scan:** No TBD/TODO; all code blocks are complete file contents or exact snippets.

**Type/name consistency:** `.foh-v2` and `.foh-v2-scroll` defined in Task 1 are the exact class names used in Task 2's JSX. Cyan `#06b6d4` / `rgba(6,182,212,...)` used consistently across all tasks. `AiChat` import preserved in Task 3 as noted.
