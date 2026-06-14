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

---

## Detailed Entries

### 2026-06-10 — Auto-Scheduler Phase 0 Design: Roster Schema & Architecture

**File(s) Changed:** `docs/auto-scheduler-design.md` (NEW) **Type:** `config`
**Summary:** Produced the Phase 0 design document for the auto-scheduler roster:
full SQL schema for the roster tables, Phase 0 architecture decisions (T0.1–T0.5
recommendations), and integration plan with the existing schedule grid. Design
only — no migrations applied; awaiting owner approval (Checkpoint 0).

**Details:**

- **Phase 0 decisions recorded:** deterministic solver Edge Function (Gemini only
  for unfilled-slot explanations), hard 40h cap with per-run OT toggle, soft target
  hours, `schedules.status` draft/published column, labor cost out of scope v1
- **Canonical vocabularies:** shift types (AM/PM/Banquet/Turn/Pool) and 14 stations
  enforced via CHECK constraints; `Grill` normalized to `Char`
- **`employees` table:** name (unique, case-insensitive), active, eligible shift
  types, trained stations, primary station (no secondary column — derived),
  max/target weekly hours, typical days/week, `varies_weekly` flag, notes
- **`availability_rules` table:** one polymorphic relational table covering all
  four §4.1 availability shapes via `rule_type` (available_window /
  exclude_shift_type / locked_shift) with per-type CHECK integrity
- **`weekly_availability` table:** per-week entries for varies-weekly staff
  (Christian Aaron, Jyanelli Rosas); generator flags missing weeks
- **Compatibility:** generator will emit `schedule_data.shifts[]` in the existing
  grid shape (employee_name keyed) plus an `employee_id` field, so current grid,
  colors, and edit flows need zero changes
- **Open items:** owner sign-off on §1 decisions, Becca Liptak modeling choice,
  weekly-entry workflow ownership, Live Music date source, exact days for
  3-day/week workers

---

### 2026-06-10 — Auto-Scheduler Design Approved with Owner Revisions

**File(s) Changed:** `docs/auto-scheduler-design.md` **Type:** `config`
**Summary:** Owner reviewed Checkpoint 0 and approved with revisions. Design doc
rewritten to match: deterministic solver builds the draft first, then AI reviews
as the safety net; availability is free-form with no rigid rule types; employees
set their own availability from the crew side.

**Details:**

- **Generator pipeline (T0.1 final):** deterministic solver places standing
  shifts and fills all slots honoring hard constraints → Gemini review pass
  cross-references candidates for unfilled slots, sanity-checks the week, and
  writes plain-English explanations → AI-suggested fills re-checked against hard
  constraints before landing
- **Overtime (T0.2):** 40h cap, manager override via per-run "Allow overtime"
  toggle — confirmed
- **Labor cost (T0.5):** fully out of scope, no pay columns
- **Availability redesign:** dropped the `availability_rules` rule-type table;
  replaced with a single flexible `employee_availability` table — per-day rows
  with loose status, optional time window, free-text note; `week_start NULL` =
  recurring default week, dated = per-week override; no row = fully available
- **Dropped `varies_weekly` flag:** week-override model covers Christian Aaron /
  Jyanelli Rosas naturally (sparse default + weekly entries)
- **Added `employees.availability_notes`** free-text field the AI reads
- **New crew-facing page planned:** `/kitchen/availability` (TimeOff name-select
  pattern) so staff enter their own availability, reflected live to the office
  roster and generator
- **New Phase 3 feature noted:** "Who can cover this shift?" — click an open slot,
  AI returns ranked eligible candidates with reasons (owner's core use case)

---

### 2026-06-10 — Requirements Doc Synced with Approved Design

**File(s) Changed:** `docs/auto-scheduler-requirements.md` **Type:** `config`
**Summary:** Updated the requirements spec to reflect all decisions made during
the 2026-06-10 design review so the two docs no longer disagree.

**Details:**

- Header status: requirements → design complete & approved; points to
  `docs/auto-scheduler-design.md`
- §2 Users: crew are no longer read-only — they self-serve availability
- §3 Confirmed Decisions: added 9 rows (generator architecture, overtime, target
  hours, publish semantics, labor cost, free-form availability model, crew
  self-service ownership, roster seeding source)
- §4.1: replaced the rigid four-shape recurring availability spec with the
  free-form model (default week + per-week overrides, no entry = fully available)
- §5 Phase 1: retitled "Roster Manager + Crew Availability"; FR1.3/FR1.4 rewritten;
  added FR1.5 crew availability page
- §5 Phase 3: FR3.6 confirmed params; added FR3.7 "Who can cover this shift?"
- §6.1 feasibility note marked RESOLVED (solver-first + AI safety net)
- §9: marked Q4, Q5, Q7, Q8, Q9, Q10, Q11 resolved; added Q13 (exact days for
  3-day workers) and Q14 (crew availability identity / no auth in v1)

---

### 2026-06-10 — Auto-Scheduler Phase 1: Roster Manager + Crew Availability

**File(s) Changed:**
`supabase/migrations/20260610000000_create_roster_tables.sql` (NEW),
`supabase/migrations/20260610000001_seed_roster.sql` (NEW),
`app/src/lib/rosterConstants.js` (NEW),
`app/src/components/AvailabilityWeekEditor.jsx` (NEW),
`app/src/pages/RosterPage.jsx` (NEW),
`app/src/pages/AvailabilityPage.jsx` (NEW),
`app/src/App.jsx`, `app/src/components/OfficeLayout.jsx`,
`app/src/pages/TimeOff.jsx`, `app/src/index.css`
**Type:** `feature` + `migration`
**Summary:** Built and shipped Phase 1 of the auto-scheduler: employees +
employee_availability tables (applied to production Supabase), 32-person roster
seeded from Roster Roles.txt, office Roster Manager page, and crew-facing My
Availability page. Production build verified clean.

**Details:**

- **Migration (`create_roster_tables`, applied to prod):** `employees` (name
  unique case-insensitive, active, eligible_shift_types text[], trained_stations
  text[], primary_station, max/target weekly hours, typical_days_per_week,
  availability_notes, notes) + `employee_availability` (week_start NULL =
  recurring default week, dated Monday = per-week override; day_of_week Mon=0;
  loose status + optional time window + free-text note). Partial unique indexes
  for the NULL/dated week contexts, open RLS, realtime publication on both.
- **Seed (applied to prod):** 32 employees with shift types, stations, primary
  station, days/week, and availability notes derived from Roster Roles.txt;
  16 explicit availability rows for Becca Liptak (Tue–Fri 6a–3p windows),
  Rico Struckoff (Wednesdays only), Matthew Biebel (no Mondays, Wed Pizza
  Wagon 1:30–9:30). Verified counts: 32 employees / 16 availability rows.
- **`rosterConstants.js`:** canonical SHIFT_TYPES + 14 STATIONS, Monday-start
  day labels, isoDate/mondayOf/upcomingMondays/friendlyTime helpers.
- **`AvailabilityWeekEditor.jsx` (shared):** 7-day grid editor; per-day
  No entry / Available / Unavailable segmented control, optional time window,
  note field; replace-all save; used by both office and crew pages.
- **`RosterPage.jsx` (`/office/roster`):** searchable employee list with shift
  chips and active filter; full editor modal (chip toggles for shift types and
  stations, primary-station select constrained to trained stations, hours and
  days fields, notes); availability section with Normal week / next 8 weeks
  selector; deactivate/reactivate, delete with confirm; realtime list refresh.
- **`AvailabilityPage.jsx` (`/kitchen/availability`):** TimeOff-style
  name-select (no auth, v1), shows office's availability_notes on file,
  edits normal week or a specific upcoming week, saved confirmation flash.
- **Wiring:** routes in App.jsx, Roster sidebar link in OfficeLayout, "My
  Availability" button on kitchen Time Off page header (bottom tab bar full).
- **CSS:** ~300 lines — roster list/chips/modal, availability day rows with
  green/red status edges, scoped form-control styling, mobile stacking.
- **Verification:** `npm run build` clean (pre-existing chunk-size warning only).
- **Checkpoint 1 (open):** owner reviews seeded roster in UI, fills unknown
  days for 3-day/week workers, confirms Becca/Christian/Jyanelli handling.

---

### 2026-06-10 — Add My Availability Button to Kitchen Dashboard

**File(s) Changed:** `app/src/components/ScheduleWidget.jsx` **Type:** `fix`
**Summary:** The crew availability page had no entry point on the kitchen
dashboard (owner had to type the URL). Added a "My Availability" button to the
"Who's Working Today" schedule widget header.

**Details:**

- Converted the widget's outer `<Link>` wrapper to a `<div>` with an `onClick`
  navigate to `/kitchen/schedule` (nested links are invalid HTML)
- Added a "My Availability" `Link` button (clock icon, `btn-secondary btn-sm`)
  in the header with `stopPropagation` so it doesn't trigger the card's
  schedule navigation
- Verified production build clean

---

### 2026-06-10 — Kitchen Dashboard Redesign: Office-Style Sidebar Layout

**File(s) Changed:** `app/src/components/KitchenLayout.jsx`,
`app/src/pages/Dashboard.jsx`, `app/src/index.css`
**File(s) Deleted:** `app/src/components/ScheduleWidget.jsx`,
`app/src/components/SalesBriefing.jsx`
**Type:** `feature`
**Summary:** Rebuilt the kitchen shell to match the office dashboard layout: a
left sidebar (Brief, Events, Schedule, Availability, Recipes, Sales, Time Off,
Assistant) replaces the floating bottom tab bar, and the Brief page now shows
only Weather, Features, Briefing, and Tasks. Colors unchanged — the kitchen
keeps its own background and orange accents.

**Details:**

- **KitchenLayout.jsx:** rewrote to the office-v2 sidebar structure (reusing
  `office-v2-*` classes with a `.kitchen-v2` modifier). Sidebar nav: Brief,
  Events, Schedule, Availability, Recipes, Sales, Time Off; Assistant button
  pinned at the bottom with the same long-press-for-voice behavior; mobile
  hamburger + slide-in sidebar + overlay inherited from the office media queries
- **Dashboard.jsx (Brief page):** removed the Events card, Who's Working Today
  widget, Active Recipes card, 86 Feed, and Sales Briefing card (all reachable
  from the sidebar now); removed their now-dead data fetches (workbook count,
  BEO queries); kept header/settings, Weather, WeeklyFeatures, Briefing notes,
  and Tasks in a new two-column `kitchen-brief-grid`
- **index.css:** `.kitchen-v2` overrides keep the kitchen's body gradient and
  `#18181b` sidebar surface (no office grid-pattern overlay); new
  `.kitchen-brief-grid` (2fr/1fr, stacks under 900px) with `grid-area: auto`
  neutralizers for the reused cards
- **Dead code removed:** deleted `ScheduleWidget.jsx` and `SalesBriefing.jsx`
  (kitchen-dashboard-only components, now unused; `EightySixFeed` kept — still
  used by FOH dashboard)
- **Verification:** production build clean (125 modules)

---

### 2026-06-11 — Availability Submission Status + Office Approval

**File(s) Changed:**
`supabase/migrations/20260611000000_add_availability_status.sql` (NEW),
`app/src/pages/AvailabilityPage.jsx`, `app/src/pages/RosterPage.jsx`,
`app/src/index.css`
**Type:** `feature` + `migration`
**Summary:** Office can now see at a glance who has filled out their
availability and who hasn't. Each roster row shows a status badge (No
availability / Pending review / Approved); crew saves flag the employee as
pending, and the office approves with one click.

**Details:**

- **Migration (applied to prod):** added `employees.availability_status` text
  column, default `'none'` (`none` → never filled out, `pending` → crew saved,
  awaiting office review, `approved` → office signed off)
- **AvailabilityPage.jsx (crew):** after a successful availability save,
  updates the employee's status to `pending` — including re-edits after a
  previous approval, so changed availability always returns for review
- **RosterPage.jsx (office):** color-coded status badge on every roster row
  (gray "No availability", amber "Pending review", green "Approved"); an
  orange one-click "Approve" button appears only on pending rows; header
  subtitle shows "N availability submissions awaiting review" when any are
  pending; existing realtime subscription on `employees` makes badges flip
  live as crew submit
- **index.css:** `.avail-badge` variants + `.avail-pending-summary` styles
- **Verification:** production build clean

---

### 2026-06-11 — Availability Wording: "Available With No Times = Open All Day"

**File(s) Changed:** `app/src/components/AvailabilityWeekEditor.jsx`,
`app/src/pages/AvailabilityPage.jsx`, `app/src/index.css`
**Type:** `fix`
**Summary:** Crew were selecting "Available" without entering hours to mean
"open anytime that day" — which already matches how the data is stored and
interpreted. Updated the crew-facing UI text to confirm that behavior instead
of fighting it. No data or logic changes.

**Details:**

- **AvailabilityWeekEditor.jsx:** editor hints rewritten — default week:
  "Available with no times = open all day. Only add times if you are limited
  to certain hours."; week override: "Days without an entry follow your normal
  week. Available with no times = open all day."
- **AvailabilityPage.jsx:** added a blue info explainer box above the editor:
  Available with no times = any time that day; add times only if limited;
  mark Unavailable if you can't work
- **index.css:** `.avail-explainer` info-box styling
- Labels remain No entry / Available / Unavailable; status values and the
  generator's interpretation (blank times = whole day) were already correct

---

### 2026-06-11 — Replace "No entry" Button with × Clear Control

**File(s) Changed:** `app/src/components/AvailabilityWeekEditor.jsx`,
`app/src/index.css`
**Type:** `fix`
**Summary:** Removed "No entry" as a visible third status button — crew now
choose only between Available and Unavailable. The no-entry state still exists
underneath (fully open on the normal week, inherit-normal-week on overrides)
but is reached via a small × clear/undo icon on rows that have an entry.

**Details:**

- `STATUS_OPTIONS` reduced to Available / Unavailable; "none" removed from
  the segmented control
- Added a circular × button (`.avail-day-clear`, red hover) on any day row
  with an entry; clicking it deletes the entry, returning the day to its
  default state — also serves as the undo for mistaken entries
- Editor hints rewritten: normal week — "Untouched days count as fully open…
  Use × to undo a day."; week override — "Untouched days follow your normal
  week. Use × to undo a change for this week."
- No data model or save-logic changes; week-override inheritance unchanged

---

### 2026-06-11 — Remove "On File" Note from Crew Availability Page

**File(s) Changed:** `app/src/pages/AvailabilityPage.jsx`, `app/src/index.css`
**Type:** `fix`
**Summary:** Removed the "On file: …" banner that showed crew the manager-
entered `availability_notes` from their roster record — internal management
notes should not be visible kitchen-side.

**Details:**

- Removed the `avail-office-note` banner block from `AvailabilityPage.jsx`
- Trimmed `availability_notes` from the crew page's employees query
  (now selects `id, name` only)
- Deleted the orphaned `.avail-office-note` CSS rule
- Office roster modal still shows/edits availability notes as before

---

### 2026-06-12 — Office View: Explicit "Open — any time" Chip on Untouched Days

**File(s) Changed:** `app/src/components/AvailabilityWeekEditor.jsx`,
`app/src/pages/RosterPage.jsx`, `app/src/index.css`
**Type:** `fix`
**Summary:** Crew submissions that only mark unavailable days (leaving the rest
untouched = open all day) looked like empty/blank forms in the office roster
modal. The office view now labels every untouched day explicitly instead of
showing unselected grey buttons.

**Details:**

- `AvailabilityWeekEditor` gained an `officeView` prop (default false); when
  set, day rows with no entry render a chip: green "Open — any time" on the
  normal week, neutral "Follows normal week" on week overrides
- `RosterPage.jsx` passes `officeView` to the editor in the employee modal;
  the crew page editor is unchanged (keeps the × clear/undo presentation)
- `index.css`: new `.avail-open-chip` (green tint, matches
  `.avail-badge-approved`) and `.avail-open-chip.inherit` (muted) styles
- Root cause investigation confirmed no data loss: crew saves were landing in
  `employee_availability` correctly; this was purely an office-side display
  ambiguity introduced by the "untouched = open" model
- **Verification:** production build clean (125 modules)

---

### 2026-06-14 — Office Can Approve / Un-approve Availability (Auto-Approve on Save)

**File(s) Changed:** `app/src/pages/RosterPage.jsx`, `app/src/index.css`
**Type:** `feature`
**Summary:** Office had no way to mark an employee's availability as Approved
unless the crew had submitted it (the Approve button only rendered for
`pending` rows). When the office entered someone's availability themselves and
saved, the status stayed `none`, the badge still read "No availability," and
there was no sign-off path. Office-entered availability now auto-approves on
save, and approvals can be cleared (un-approve).

**Details:**

- **Auto-approve on save:** `RosterPage` passes an `onSaved` handler to the
  office `AvailabilityWeekEditor` that flips the employee to
  `availability_status = 'approved'`. Mirrors the crew page pattern, where the
  page (not the editor) owns the status flip — crew save → `pending`, office
  save → `approved`. Editor component itself unchanged.
- **Generalized `approveAvailability` → `setAvailabilityStatus(emp, status)`:**
  single helper handles approve (`'approved'`) and un-approve (`'none'`); also
  reflects the change immediately in the open editor modal via `setEditing`.
- **Row controls:** `pending` rows keep the orange Approve button; `approved`
  rows now show a secondary "Un-approve" button (clears back to `none`).
- **Modal indicator:** availability section header shows the live status badge
  (No availability / Pending / Approved), an Un-approve button when approved,
  and a hint that saving marks the employee Approved.
- **`index.css`:** added `.roster-avail-note` hint styling.
- No schema/migration change — reuses the existing
  `employees.availability_status` column.
- **Verification:** production build clean (125 modules).

---

### 2026-06-14 — Source of Truth: Scheduling Rules Section (Office Schedule)

**File(s) Changed:**
`supabase/migrations/20260614000000_create_scheduling_rules.sql` (NEW),
`app/src/components/SchedulingRulesSection.jsx` (NEW),
`app/src/pages/SchedulePage.jsx`, `app/src/index.css`
**Type:** `feature` + `migration`
**Summary:** Added an office-only "Source of Truth — Scheduling Rules" section
to the Schedule page where managers capture standing constraints and per-week
exceptions. This is the data-capture layer for the auto-scheduler generator
(Phase 2/3, not yet built): the generator will read these rules when creating a
new schedule. Captures rules now so the constraints exist before the generator.

**Details:**

- **Migration (`create_scheduling_rules`, APPLIED TO PROD):** `scheduling_rules`
  table — `rule_text`, `active` (pause without deleting), `week_start`
  (NULL = standing rule for every schedule; dated Monday = that week only,
  mirroring the `employee_availability` week-context model), `sort_order`.
  Index on `week_start`, open RLS (`allow_all_scheduling_rules`), realtime
  publication. Verified queryable (0 rows).
- **`SchedulingRulesSection.jsx` (NEW):** self-contained manager UI — segmented
  scope toggle (Standing / Just for <week>), add via input+Enter, click-to-edit
  inline, active/pause checkbox toggle, delete. Loads standing + current-week
  rules with `.or(week_start.is.null,week_start.eq.<week>)`; realtime refresh.
  "This week" scope disabled until a week is selected.
- **`SchedulePage.jsx`:** renders `<SchedulingRulesSection weekStart={activeWeekStart} />`
  after the toolbar, **office mode only** (crew never see management constraints).
- **`index.css`:** `.sot-*` styles matching the page's dark/orange card system.
- **Not built yet (by design):** the generator that reads these rules — that's
  the Phase 2/3 `/sc:implement` work. This change only captures + stores them.
- **Verification:** production build clean (126 modules).

---
