# Session 2026-07-12 — FOH Sidebar Layout + Cyan Theme

## Shipped to prod (`main` @ `0c1d14e`, Vercel auto-deploys)
Converted the Front-of-House shell from the floating **bottom tab bar** to the office-style **left sidebar** (mirrors `KitchenLayout`), fully **cyan** (`#06b6d4`), no orange.

- New `.foh-v2` CSS modifier (parallel to `.kitchen-v2`): cyan accent vars, cyan nav hover (outline + glow), cyan active-nav state overriding the office shell's hardcoded orange (`.office-v2-nav-link.active` = `#e66b35`), cyan card hover.
- `FOHLayout.jsx` rewritten: nav = **Brief · Events · Recipes** + Assistant (long-press voice). Excluded by owner: Schedule/Availability/Time Off/Sales.
- Removed dead `/foh/chat` route + orphaned `.app-shell.foh-theme` block.
- `FOHDashboard.jsx`: removed "Upcoming Events" + "Active Recipes" tiles (sidebar-only now) and their orphaned `stats`/`beoCount` state, queries, and CSS.

## Also fixed this session
Events-page BEO delete/edit buttons were invisible — regression from commit `035e381` which put hover-reveal `opacity:0` on the **shared** `.wb-act-btn` class. Fixed by scoping the hidden state to `.wb-note .wb-act-btn`. (Committed by owner as `9438671`.)

## Process notes
- Executed via superpowers brainstorm → spec → plan → subagent-driven-development (4 tasks, per-task review, final opus whole-branch review = Ready to merge). Spec/plan under `docs/superpowers/`.
- Repo has **no component test runner**; verification = `npm run build` from `app/` + visual check.
- Owner preference: remove dashboard tiles that merely duplicate sidebar destinations.

See `mem:session-2026-07-07` (auto-scheduler) for prior context. File-based memory: `project_foh_sidebar`.
