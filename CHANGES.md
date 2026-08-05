# DailyBrief — Change Log

> **Consolidated 2026-06-12.** Entries before the auto-scheduler work
> (2026-06-10) are condensed to one line each in the Archive below — full
> details live in git history. Keep this file under 500 lines: when it grows
> past that, condense the oldest detailed entries into the Archive.
> A duplicated block of April 2026 entries was removed during consolidation.

---

## Archive — Condensed History

### March 2026

- 03-19 — Fix Embedding API 404 Errors
- 03-19 — Move Briefing Cycler to Morning Notes Card
- 03-19 — Restructure Office Dashboard
- 03-19 — Management Whiteboard Feature
- 03-19 — Move Management Board to Dedicated Page
- 03-20 — Redesign Management Board (Column Layout)
- 03-20 — Weekly Features Schedule Column
- 03-20 — Refactor Kitchen Sales View
- 03-21 — Refine Top Selling Items
- 03-22 — Hide Sweet Potato Fries
- 03-23 — Events & Banquets Migration and Parse
- 03-23 — ReserveCloud Scraping Implementation
- 03-24 — Fixed BEO Upload CORS and Prompt
- 03-24 — Fixed UI Stale Data
- 03-24 — Fixed Office Dashboard Tasks Route
- 03-25 — In-App Recipe Creator
- 03-25 — Recipe Creator Single-Sheet Fix
- 03-25 — Move 86'd Items to Kitchen Dashboard
- 03-26 — Swap Recipes Tile to Left of Sales
- 03-26 — Dashboard Tile Hover Effect
- 03-26 — Uniform Dashboard Tile Border Thickness
- 03-26 — Office Dashboard Tile Hover Effect
- 03-26 — Fix BEO Multi-Event PDF Parsing
- 03-26 — BEO Table Management: Delete, Clear All, Completion Checkbox
- 03-26 — BEO Card Rename & Sort Order Fix
- 03-26 — Fix BEO Quantity Number Wrapping
- 03-27 — BEO Card Layout Redesign for Readability
- 03-27 — Events & Catering on Kitchen Dashboard
- 03-28 — Show Event Times on BEO Cards

### April 2026

- 04-07 — Move Lunch & Dinner Features to Dashboards
- 04-07 — Fix Features Card Grid Position on Kitchen Dashboard
- 04-07 — Fix Office Dashboard Route Mismatch
- 04-08 — Remove FOH Code & Fix Briefings on Main Branch
- 04-08 — Sales Intelligence for Assistant & Extracted Item Pricing
- 04-08 — Add Manager Board to Office Dashboard
- 04-10 — Fix Weather Edge Function 500 Errors
- 04-11 — Fix Pin/Trash Overlap on Communication Posts
- 04-11 — Sales Trend Chart with New Financial Columns
- 04-11 — Refactor Sales Trend Chart to Show Food Categories
- 04-11 — Remove Recent Activity Widget
- 04-12 — Sales Trend Item Drill-Down & Timeframes
- 04-15 — Fix Item Sales Date Off-By-One
- 04-15 — Fix Edge Function 401 Unauthorized Error
- 04-16 — Item Sales Multi-PDF Upload on Office Dashboard
- 04-16 — Kitchen Dashboard Lunch & Dinner Features Mirror
- 04-21 — Time Off Request Calendar
- 04-30 — Event Order List with AI Ingredient Breakdown

### May 2026

- 05-04 — BEO Card Two-Column Layout (Kitchen + Office)
- 05-05 — Events Page Mobile Layout Fix
- 05-05 — Mobile Sidebar Toggle for Office Dashboard
- 05-06 — Events Page BEO Table Horizontal Scroll Fix
- 05-07 — BEO Details Responsive Table Reflow
- 05-08 — Prep List Generator + Subtask System
- 05-12 — Collapsible BEO Task Panel
- 05-13 — BEO Duplicate Update: Preserve Tasks, Notes & Order Items
- 05-17 — Rotating "No Briefing Today" Message on Kitchen Dashboard
- 05-17 — Inline Notes on Event Order List Items
- 05-21 — BOH Weekly Schedule Viewer & Multimodal OCR Parser
- 05-22 — Capacity Limits on Daily Time Off Requests
- 05-22 — Upcoming Week Schedule Uploads
- 05-22 — Shifted Weekly Schedule to Monday Start
- 05-22 — Custom Humorous Schedule Parsing Messages
- 05-22 — Visual Schedule Lightbox Syntax Cleanup
- 05-22 — Single-File Schedule Merge Support
- 05-23 — Color Coding on BOH Weekly Schedule Roster
- 05-23 — Shift-Level Custom Color Overrides in Verify Preview
- 05-26 — Refined Weekly BOH Schedule Color-Coding and Color-Leak Prevention
- 05-26 — Cascading Checkbox Toggles for BEO Prep Lists and Order Lists
- 05-29 — Resolved BEO PDF Parser Gateway Timeout (504)
- 05-29 — Optimized BEO Parser Model and Timeout Margins
- 05-30 — Reverted Model to gemini-2.5-flash with Extended Timeouts
- 05-30 — Increased Daily Time Off Request Limit to 3 People
- 05-31 — Interactive Employee Weekly Schedule Pop-up Modal

### June 2026 (pre-auto-scheduler)

- 06-01 — Fixed Schedule Week Selection Dropdown Reset Bug
- 06-01 — Editable Shift Roster Preview and 8-Column Grid Parser
- 06-01 — Orange Highlight Color Addition
- 06-01 — Custom Shift Row Button Repair
- 06-02 — Edge Function Deno TS Diagnostic Fixes
- 06-02 — Shift Editor Modal and Multiple Shifts Support in Office Dashboard

### June 2026 (auto-scheduler & availability)

- 06-10 — Auto-Scheduler Phase 0 Design: Roster Schema & Architecture
- 06-10 — Auto-Scheduler Design Approved with Owner Revisions
- 06-10 — Requirements Doc Synced with Approved Design
- 06-10 — Auto-Scheduler Phase 1: Roster Manager + Crew Availability
- 06-10 — Add My Availability Button to Kitchen Dashboard
- 06-10 — Kitchen Dashboard Redesign: Office-Style Sidebar Layout
- 06-11 — Availability Submission Status + Office Approval
- 06-11 — Availability Wording: "Available With No Times = Open All Day"
- 06-11 — Replace "No entry" Button with × Clear Control
- 06-11 — Remove "On File" Note from Crew Availability Page
- 06-12 — Office View: Explicit "Open — any time" Chip on Untouched Days
- 06-14 — Office Can Approve / Un-approve Availability (Auto-Approve on Save)
- 06-14 — Source of Truth: Scheduling Rules Section (Office Schedule)
- 06-14 — Auto-Scheduler Phase 2: Coverage Template + Roster & Coverage Hub
- 06-19 — Event Task "Working On It" State + Realtime Sync

---

## Detailed Entries

### 2026-07-11 — Fix: Restore Invisible Delete/Edit Buttons on Events Page

**File(s) Changed:** `app/src/index.css`
**Type:** `fix`
**Summary:** The office Events tab lost its BEO delete/edit buttons — the cursor still
changed on hover but nothing was visible and the target was easy to miss. Regression
from commit `035e381` (communication board acknowledgements), which moved the
hover-reveal `opacity: 0` from the `.wb-note-actions` container onto the shared
`.wb-act-btn` class. Because Events-page buttons use `.wb-act-btn` but are not inside
a `.wb-note`, the `:hover` reveal never fired and they stayed permanently `opacity: 0`.

**Details:**

- **Root cause:** `.wb-act-btn { opacity: 0 }` hid every action button app-wide, while
  only `.wb-note:hover .wb-act-btn { opacity: 1 }` revealed them — a scope that excludes
  the Events page (and any other non-note usage).
- **Fix:** removed the blanket `opacity: 0` from `.wb-act-btn`; scoped the hidden state
  to `.wb-note .wb-act-btn { opacity: 0 }`. Communication-board hover-reveal preserved;
  all other `.wb-act-btn` instances are visible again.
- **Blast radius restored:** BEO delete + edit, event-task delete, subtask delete, and
  order-item delete were all affected (all `.wb-act-btn` outside `.wb-note`).
- **Verification:** production build clean (2.47s).

---

### 2026-07-12 — FOH Sidebar Layout + Cyan Theme Fix

**File(s) Changed:** `app/src/components/FOHLayout.jsx`, `app/src/index.css`,
`app/src/App.jsx`, `app/src/pages/FOHDashboard.jsx`
**Type:** `feature` + `fix`
**Summary:** Converted the Front of House shell from the floating bottom tab bar to
the office-style left sidebar (mirrors KitchenLayout) and fixed the FOH theme to be
fully cyan — including a cyan hover glow and a cyan active nav state (previously the
office shell's hardcoded orange bled through). Also removed the now-redundant
"Upcoming Events" and "Active Recipes" tiles from the FOH dashboard, since those
sections are reachable from the sidebar.

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
- **`FOHDashboard.jsx`:** removed the "Upcoming Events" and "Active Recipes" dash tiles
  (now sidebar-only) and cleaned up the orphaned `stats`/`beoCount` state and their
  workbook/briefing-count/`banquet_event_orders` queries; the briefing loader is now a
  single query instead of a one-item `Promise.all`. Also removed the now-unused
  `.active-recipes-card` / `.events-card` grid rules (`index.css`, `mobile.css`)
  orphaned by the tile removal.
- **Scope:** Schedule/Availability/Time Off/Sales deliberately left off FOH (owner
  decision). No data/backend changes.
- **Verification:** production build clean; visual check of sidebar, cyan hover/active,
  and mobile hamburger.

---

### 2026-07-17 — Prep List Portion Scaling: Built, Deployed, then Scrapped (perf change kept)

**File(s) Changed:** `supabase/functions/generate-prep-tasks/index.ts` (committed `23332a2`, deployed)
**Type:** `perf` (net) — feature work reverted
**Summary:** Explored an AI-inferred "portion scaling" feature that computed order-basis-aware
quantities (finished + raw, via yield) for every event prep task/subtask, stored in a new
`event_tasks.portion jsonb` column and shown as badges. Fully built via
`/sc:research` → `/sc:workflow` → `/sc:implement` (migration + edge fn v4/v5 + client + CSS) and
verified working, but the owner **scrapped it** — not accurate/valuable enough for the effort. A
follow-on idea to move the quantity math to the **Event Order List** (`event_order_items`, which
has no quantity field) was discussed but **not built**.

**Details:**

- **Reverted:** the `event_tasks.portion` column was **dropped** from prod; `generate-prep-tasks`
  was restored to its original plain-tasks behavior (subtasks back to `string[]`); all client
  changes (badges, `guest_count`, portion inserts) and the migration/workflow docs were removed.
  No trace of the feature remains in prod or on `main`.
- **Kept (the one net change):** switched `generate-prep-tasks` from `gemini-3.1-pro-preview`
  (~28s even on trivial input, caused 500s under the heavier prompt) to **`gemini-3-flash-preview`
  + `maxOutputTokens` 8192** — now ~8.5s on a real BEO, matching `generate-order-items`. Plain
  prep-list output unchanged; `verify_jwt: true` preserved. Committed `23332a2`, pushed to `main`.
- **Kept for reference:** `claudedocs/research_prep_list_portion_scaling_2026-07-17.md` (the
  `/sc:research` output — culinary portion standards, scaling math, data-model options).
- **Reusable knowledge captured this session:** BEO items encode their order **basis** in the item
  text with the Qty column as a multiplier — `"N pieces" × Qty = count`, `"each" + Qty = count`,
  `"Serves N" × Qty = people`. Relevant to any future order-quantity work.

---

### 2026-07-19 — Stacked Same-Day Briefings + Attribution + Local-Date Fix

**File(s) Changed:** `app/src/pages/Dashboard.jsx`, `app/src/pages/FOHDashboard.jsx`,
`app/src/pages/BriefingEditor.jsx`, `app/src/lib/dates.js` (new), `app/src/index.css`,
`app/src/mobile.css`, migration `add_author_to_briefings`
**Type:** `feature` + `fix`
**Summary:** When two managers posted briefings on the same day, crew effectively saw only
one — the second appeared to overwrite the first. The rows were never overwritten; all of
the day's briefings were loaded but shown one at a time behind a low-salience
"Briefing 1 of N" pager that nobody noticed. Replaced the pager with a stacked layout that
renders every briefing for the day at once, added per-briefing attribution, merged the task
lists, and fixed a UTC date bug in the same code path.

**Details:**

- **Stacked display:** `.briefing-stack` renders every briefing for the day as its own
  `.briefing-block` (title, byline, notes), newest first. Previously the pager opened on
  `activeIndex 0` with `created_at` **ascending**, so it showed the *oldest* briefing and hid
  the newest — the reverse of what was assumed. Cycler markup + CSS removed from both
  dashboards; `.briefing-cycler*` rules deleted from `index.css` and `mobile.css`.
- **Attribution:** new nullable `briefings.author` column (no default, so the 70 pre-existing
  rows stay `NULL` and render with a timestamp only rather than a fabricated name). Editor
  captures "Posted by" via the existing `lib/identity.js` localStorage helper, shown only when
  creating; editing leaves the original author untouched.
- **Merged tasks:** the Tasks card now lists tasks from all of the day's briefings. Ordering
  groups by parent briefing before `sort_order`, because `sort_order` is scoped per briefing
  and restarts at 0 — sorting on it alone interleaved two managers' lists. Badge sums the day.
- **Local-date fix:** new `lib/dates.js` with `localDateString()`. `Dashboard.jsx` derived
  "today" from `new Date().toISOString()` (UTC), which rolls over at 7pm Central — after that
  the equality check failed and the card fell through to the "No briefings today" message
  while briefings existed. Also replaced the editor's UTC date default. The kitchen loader
  collapsed from two queries to one as a result.
- **Same-day notice:** the editor shows a non-blocking hint when the chosen date already has
  briefings ("Yours will be added alongside it, not replace it").
- **FOH parity:** same stacking, bylines and merged tasks. Kept its existing "most recent
  posted date" semantics rather than gating to today — that difference predates this work.
- **Verification:** production build clean (2.29s); visually confirmed on the kitchen
  dashboard against today's two live briefings (9:34pm + 5:27pm, merged 0/2 task badge).
  The editor's same-day notice was not visually verified — blocked by the office password gate.

---

### 2026-07-19 — Fix: Upcoming Banquets Dropped the Current Day After 7pm

**File(s) Changed:** `app/src/pages/EventsBanquetsPage.jsx`
**Type:** `fix`
**Summary:** The Upcoming Banquets query filtered `event_date >= today` using a UTC-derived
date, so from 7pm Central onward it effectively asked for "tomorrow onward" and dropped the
current day's events from the list five hours before the day was over. Same root cause as the
briefing blackout fixed earlier today; second instance of the pattern.

**Details:**

- `loadBanquets()` line 99: `new Date().toISOString().split('T')[0]` → `localDateString()`
  from the `lib/dates.js` helper added in `bce3917`.
- **Impact:** a chef pulling up Events during evening service would not see the event they
  were currently working. Milder than the briefing bug (a list clipped its top entry rather
  than a card blanking entirely), which is likely why it went unreported.
- **Remaining instances not fixed:** `SchedulePage.jsx:216,984` (todayStr comparisons) and
  the week-math spots in `WeeklyFeatures.jsx` / `SalesTrendChart.jsx` / `SchedulePage.jsx`.
  The week-math ones derive week starts rather than comparing "today", so they carry less risk.
- **Verification:** production build clean (2.43s); Events page loads and renders the banquet
  list correctly. The evening behavior itself was **not** directly observed — the fix was made
  at 7:40am, before the rollover threshold, and there are no `upcoming_banquets` rows dated
  today to serve as a live test case.

---

### 2026-07-22 — Fix: Evening Briefings Vanished Next Day (smart date default)

**File(s) Changed:** `app/src/lib/dates.js`, `app/src/pages/BriefingEditor.jsx`
**Type:** `fix`
**Summary:** A briefing posted Tuesday evening for Wednesday disappeared Wednesday morning.
Regression from `bce3917`: that commit changed the editor's date **default** from `toISOString()`
(UTC) to `localDateString()` (local). Evening posts had been *accidentally* defaulting to the next
day (9pm Central = next day in UTC), which is exactly what the club's night-before closing-notes
workflow relied on. The local-date default correctly pre-filled *today*, so evening posts left at
the default were dated the posting day and dropped off the next day's dashboard. No deletion —
the rows persist; they simply no longer matched `date == today`.

**Details:**

- **Root cause (confirmed via data):** both 07-21 evening briefings had `date = 2026-07-21`, i.e.
  the field was left at its default. The dashboard filters `date == localDateString()`, so a
  Tuesday-dated briefing correctly vanishes Wednesday. The dashboard filter is right; the editor
  *default* was the problem.
- **Fix:** new `defaultBriefingDate(now)` in `lib/dates.js` — a smart default that pre-fills
  **today before 5pm local, tomorrow at/after 5pm** (`NEXT_DAY_CUTOFF_HOUR = 17`, one-line tunable).
  Matches the workflow (owner: briefings are always posted after dinner service, so anything from
  5pm on is for the next day). On-site devices run Central, so the local-hour check is the CST/CDT
  hour. Manager can always override in the picker. Stays on the local calendar (never rolls a day
  early via UTC).
- `BriefingEditor.jsx`: initial `date` state now `defaultBriefingDate()` instead of
  `localDateString()`. Only affects NEW briefings (editing still loads the stored date).
- **Verification:** helper logic checked via node across the 2pm boundary + month/year rollover
  (9:12pm → next day ✓, 1:59pm → today ✓, Dec 31 → Jan 1 ✓); production build clean (2.59s). The
  editor UI itself is behind the office password gate and was not visually confirmed.
- **Note:** the two stuck 07-21 briefings were left as-is (still in DB, reachable via History /
  editable) — owner to re-date whichever was intended to persist.

---

### 2026-08-03 — Claude Code health check: extension cleanup + CLAUDE.md trim

**File(s) Changed:** `CLAUDE.md`, `.claude/settings.local.json`,
`.claude/agents/*` (13 deleted)
**Type:** `chore` + `config`
**Summary:** Ran `/doctor`. The install itself was healthy (native 2.1.220 = latest,
all config parses, auto mode already default, no duplicate installs, no slow hooks,
no read-only commands worth pre-approving). The finding was extension bloat: an
`everything-claude-code` bundle (37 skills / 31 commands / 13 agents) checked into
`.claude/`, unused for 49 days, competing with SuperClaude. Cleaned it up and made
SuperClaude the project's designated toolset.

**Details:**

- **Scan window:** all 31 transcripts across 3 project dirs, 14,822 lines,
  2026-06-11 → 2026-07-30 (48.9 days). Zero dispatches of any bundle skill/command in
  that window; lifetime totals were 3 and 2, all from Feb–Apr 2026.
- **Disabled 68 bundle entries** via `skillOverrides` in `.claude/settings.local.json`
  (37 skills + 31 commands). **Caveat:** `skillOverrides` is documented for skills;
  whether it also suppresses `.claude/commands/*.md` is UNVERIFIED — confirm next
  session that those 31 commands are gone from the skill listing, else delete the files.
- **Deleted 13 bundle agents** from `.claude/agents/` (agents have no disable
  mechanism, so deletion is the only way to stop them loading). Kept
  `feature-prioritizer.md`, the one DailyBrief-custom agent.
- **Disabled the `sequential-thinking` MCP server** (0 calls in 49 days) at the user
  level; server config + OAuth preserved.
- **`CLAUDE.md` 201 → 155 lines.** Cut sections a session can derive from the repo
  (tech stack, repo URL, key pages/components, the Supabase tables and edge-function
  tables); kept the Supabase project ref. Lifted the non-derivable rationale that was
  buried in those lists into Key Design Decisions: briefing date semantics +
  `defaultBriefingDate()`, the FOH `.foh-v2` cyan shell, and the `.wb-act-btn`
  shared-class trap. Added a **Global Rule Overrides** section (no test runner on
  `main`; never auto-spawn sub-agents; SuperClaude is the primary toolset; no
  `Co-Authored-By` trailer).
- **Context saved: ~2,600 est tokens/session.** The skill listing now sits under its
  ~1% budget, so skill routing should be more accurate, not just cheaper.
- **Flagged, not fixed:** both `settings.local.json` files are committed to git though
  `*.local.json` is meant to be personal/gitignored — local permission grants are
  shared with the repo.

---

### 2026-08-04 — Separate the auto-scheduler branch from main's housekeeping

**File(s) Changed:** `CLAUDE.md` **Type:** `chore`
**Summary:** The `/doctor` cleanup had been applied while `auto-scheduler` was checked
out, stranding non-scheduler work on a side branch. Split the two change sets so the
housekeeping lands on `main` and the scheduler work stays local.

**Details:**

- **Confirmed production was never at risk:** `auto-scheduler` has never been pushed
  (`git ls-remote` shows no such branch on origin), and Vercel's production branch is
  `main`. Pushing the branch would only produce a preview deployment.
- **`auto-scheduler`** (local, unpushed) got two commits: `16318f6` the solver
  one-shift-per-day + fairness fix (50/50 tests), `61d3430` the extension cleanup.
- **`main`** got `84c1366` — the equivalent cleanup applied against main's own file
  versions, then pushed. Production deploy verified READY. Sanity-checked that the
  commit touches no `app/src` and no `generate-schedule` code.
- **Trimmed main's `CLAUDE.md` more carefully than the branch's:** main's version had
  rationale buried inside the derivable lists, so three gotchas were lifted into Key
  Design Decisions instead of deleted — briefing date semantics +
  `defaultBriefingDate()`, the FOH `.foh-v2` cyan shell, and the `.wb-act-btn`
  shared-class trap behind the 07-11 invisible-buttons regression.
- **Added a Branches section** recording that `main` is the primary workspace and
  `auto-scheduler` is a deliberately-unpushed side feature.
- **Drift flagged:** `auto-scheduler` is now 18 commits behind `main`, with
  `CHANGES.md`/`CLAUDE.md` already diverging ~1,000 lines. Merge `main` into the branch
  at the start of the next scheduler session to keep the conflict small.

---
