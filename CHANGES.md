# DailyBrief — Change Log

> **How this file works (revised 2026-09-08).** Recent work keeps its full entry
> below under **Detailed Entries**. Keep this file under **500 lines**: when it
> grows past that, **MOVE** — never delete — the oldest detailed entries into
> `docs/changelog/YYYY-MM.md`, and leave behind a one-line Archive summary that
> carries real substance plus a `→ [full]` link to the moved entry. The one-liner
> should stand on its own; the link is the fallback, not the primary interface.
>
> **Nothing is ever destroyed.** Anything condensed on or after 2026-09-08 lives in
> `docs/changelog/`. Entries condensed *before* that date (2026-03 → 2026-08, the
> title-only lines below) predate this rule and exist in full only in git history —
> recovering them into `docs/changelog/` is an open job, not yet done.
>
> **Consolidated 2026-06-12.** Entries before the auto-scheduler work (2026-06-10)
> were condensed to one line each. A duplicated block of April 2026 entries was
> removed during that pass.

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

### July 2026

- 07-11 — Fix: Restore Invisible Delete/Edit Buttons on Events Page (`.wb-act-btn` scoped to `.wb-note`)
- 07-12 — FOH Sidebar Layout + Cyan Theme Fix (`.foh-v2`)
- 07-17 — Prep List Portion Scaling: built, deployed, then scrapped; only the flash-model swap kept (`23332a2`)
- 07-19 — Stacked Same-Day Briefings + Attribution + Local-Date Fix (`lib/dates.js` added)
- 07-19 — Fix: Upcoming Banquets Dropped the Current Day After 7pm (UTC rollover)
- 07-22 — Fix: Evening Briefings Vanished Next Day (`defaultBriefingDate()` 5pm cutoff)

### August 2026

- 08-03 — Claude Code health check: extension cleanup + CLAUDE.md trim
- 08-04 — Separate the auto-scheduler branch from main's housekeeping
- 08-05 — Office Notification Bell (time off + availability)
- 08-06 — Time Off Approval Workflow + Sidebar Approval Badges
- 08-16 — Emailed BEO Ingestion: Postmark → Review Queue → Approve
- 08-18 — Kitchen Assistant Sales Path: Broken Since April, Now Exact
- 08-18 — Codex/ChatGPT Tooling Quarantined (`AGENTS.md`, `.codex/`, `.agents/skills/` gitignored; Codex stays advisory-only)
- 08-19 — BEO Exclusion Filter for ReserveCloud Packets (`receive-beo-email` v5→v7, `excluded_events` column; whole-name match, apostrophes stripped not standardised — rationale in CLAUDE.md)
- 08-19 — Fetch BEO Packets from ReserveCloud Links — `receive-beo-email` v7→v8: packets arrive as a LINK, not an attachment; two-hop fetch, backgrounded so the webhook acks in ~2s. → [full](docs/changelog/2026-08.md#2026-08-19--fetch-beo-packets-from-reservecloud-links)
- 08-24 — BEO Single-Day Events Stop Reporting a Phantom End Date — `process-beo` v16→v17: `Event Date(s)` always prints a range; same-day end collapsed to null in code, before the mode split. → [full](docs/changelog/2026-08.md#2026-08-24--beo-single-day-events-stop-reporting-a-phantom-end-date)
- 08-25 — BEO Parse Was Non-Deterministic; Same PDF, Different Structure Daily — `process-beo` v17→v21: `generationConfig` never set a temperature, so it defaulted to 1.0 and the model re-grouped an ambiguous layout on every run (43–91 items for the same ~12 events). `temperature: 0`, three prompt rules, label carry-forward moved into code. → [full](docs/changelog/2026-08.md#2026-08-25--beo-parse-was-non-deterministic-same-pdf-different-structure-daily)
- 08-29 — Parse Churn Returned; Geometric Parser Prototype — `temperature: 0` narrowed the swing but did not remove it across days (same event: 11 items on 08-26, 28 on 08-27). Prototype reads the table off PDF coordinates; validated on 5 packets / 71 events / 264 items, 71 of 71. → [full](docs/changelog/2026-08.md#2026-08-29--parse-churn-returned-geometric-parser-prototype)
- 08-30 — Geometric Parser Wired Into process-beo — `process-beo` v21→v22: geometric first, Gemini kept as the fallback and taken only when the parse fails to reconcile. All 5 packets returned `engine=geometric` in 397-1010ms against ~90s for Gemini. → [full](docs/changelog/2026-08.md#2026-08-30--geometric-parser-wired-into-process-beo)
- 08-31 — Geometric Parser Dropped Whole Menus; Reconciliation Gate Could Not See It — `process-beo` v22→v23: a row starts on a qty **or** a left-column label, because the BEO prints Qty once per section. The old gate counted qty-bearing rows — the assembler's own definition of a row — so it agreed by construction and passed a packet that lost three menus. Replaced with a per-event conservation check. → [full](docs/changelog/2026-08.md#2026-08-31--geometric-parser-dropped-whole-menus-reconciliation-gate-could-not-see-it)

### September 2026

- 09-06 — BEO Qty Column Emphasis — qty renders as a filled blue chip **centred** against its row on desktop (`a3313c1`). `align-self: center` is the load-bearing part, not the fill: on a multi-line dish the cell stretched to ~200px and the number sat top-right, far from the text it applied to. `.beo-item-qty:empty` is required, or legitimately blank quantities draw an empty pill. Mobile untouched. → [full](docs/changelog/2026-09.md#2026-09-06--beo-qty-column-emphasis-uncommitted--awaiting-owner-sign-off)
- 09-07 — Order Guide in BEO Order Lists (BRAINSTORM) — requirements for costing a BEO off the real supplier catalog. Three blockers named (unit conversion, no catalog export, no menu file) and the core call made: **inference happens once per thing, never per BEO**, so the runtime path stays arithmetic. → [full](docs/changelog/2026-09.md#2026-09-07--order-guide-in-beo-order-lists-brainstorm-only--no-code-written)
- 09-15 — Order Guide Design — all three blockers answered from delivered files. Merging the 13 raw exports reproduces the AI-built master exactly (1,381 / 394 / 6), making the master disposable. Cross-class unit conversion **forbidden** (a gap, never a guess), so density is never needed. BEO lines name dishes only inside a description string, so `beo_dish_matches` was added. Phased P0-P5. → [full](docs/changelog/2026-09.md#2026-09-15--order-guide-design-design-only--no-code-no-migration)
- 09-15 — Session Housekeeping: CHANGES.md Repair, Docs and Vendor Data Committed — the changelog had been truncated mid-entry and was rebuilt from git; `claudedocs/` and the 13 vendor order guides committed. `BEOs/` stays gitignored for PII. → [full](docs/changelog/2026-09.md#2026-09-15--session-housekeeping-changesmd-repair-docs-and-vendor-data-committed)
- 09-16 — Catalog Baseline Re-Measured and Confirmed — merged the 13 raw exports independently: **1,381 products / 394 price-varies / 6 unpriced**, matching the design on all three. The two master copies held identical product data (14 cells differ, all cached Index-sheet floats), so the 09-15 duplicate-file caution was a false alarm. PowerShell `git show >` corrupts binaries — use Bash. → [full](docs/changelog/2026-09.md#2026-09-16--catalog-baseline-re-measured-and-confirmed-closes-the-09-15-open-item)
- 09-17 — Supplier Catalog: Ingestion + Product Search (order guide **P1**) — `/office/catalog` loads the 13 PFG exports into `supplier_products`: **1,381 / 394 varies / 6 unpriced / 219 catch-weight**. Parsing lives in a pure module so the shipped code ran headless against the real files. `case_price` derives at INGEST; `category` is sticky because the upsert omits the column. A reflection pass caught that the upload BUTTON had never run — the harness had retyped the payload instead of importing it, and the two had drifted. → [full](docs/changelog/2026-09.md#2026-09-17--supplier-catalog-ingestion--product-search-order-guide-p1)
- 09-17 — Catalog Categories Seeded From the Master List — all 1,381 products carry a category + item group, and `/office/catalog` gained a category filter. Seeding is its OWN action, not part of ingestion: **one RPC** (`seed_supplier_categories`) instead of ~352 round trips, filling only NULLs so a re-run can never overwrite a curated value — proven by a second run reporting 0 seeded / 1,381 skipped. → [full](docs/changelog/2026-09.md#2026-09-17--catalog-categories-seeded-from-the-master-list)
- 09-17 — Menu Dishes: PDF Drafting + Confirm UI (order guide **P2**) — the catering menu PDFs are read into `menu_dishes` **drafts** and confirmed by a human at `/office/menus`, building the dish vocabulary BEO lines get matched against in P4. A MODEL reads these menus, not coordinates: they are hand-designed marketing layouts where a price column can sit detached from its dish. Safe only because nothing reaches confirmed data without the confirm gate. → [full](docs/changelog/2026-09.md#2026-09-17--menu-dishes-pdf-drafting--confirm-ui-order-guide-p2)
- 09-18 — Remaining 6 Menus Drafted; menu_dishes Identity Corrected — the unique key `(name, menu_source, season)` silently dropped a dish name that appears twice on one menu at two prices (Breakfast "Yogurt Parfait Bar" $10/ea vs +$6 buffet upgrade); caught only by the RPC's `read` vs `inserted` counters. Key widened to include `menu_section`. → [full](docs/changelog/2026-09.md#2026-09-18--remaining-6-menus-drafted-menu_dishes-identity-corrected)
- 09-19 — "Additional Salad" Is a Price Rule, Not a Dish — the three "Additional X" rows on Custom Buffets state a positional surcharge (the 2nd salad, whichever it is), not food; ingredients on them would **double-order**, since the real dish is its own row. Flagged `is_price_rule` (sticky: absent from the upsert's SET list) and excluded by the `orderable_menu_dishes` view, where P3 draws its work. → [full](docs/changelog/2026-09.md#2026-09-19--additional-salad-is-a-price-rule-not-a-dish)
- 09-19 — Menu Upload Accepts Word (.docx) — Gemini cannot read a .docx, so it is converted to HTML **in the browser** (mammoth behind a dynamic import): `npm:mammoth` in the edge function blew the 130s gateway on every cold start, the normal case for a once-a-season upload. The prompt became a shared core plus one source-specific section; in the Word menus `·` SEPARATES dishes while `•` PREFIXES one. Rule 7 now dedupes within a section only (it had eaten a real Plated Dinner side). → [full](docs/changelog/2026-09.md#2026-09-19--menu-upload-accepts-word-docx)
- 09-21 — Menus Wiped; Price Quantity Bug Fixed Before Reload — hors d'oeuvres were **20x too expensive** on 27 of 28 rows: "Starting at $85 for 20 pieces" was stored as $85 per piece. Added `price_qty` (`base_price` buys `price_qty x price_unit`); "Starting at" became a group FLOOR left empty; a heading's quantity basis now carries down. Prompt assembly now THROWS on a missing splice anchor. All 232 rows wiped at the owner's instruction. Lesson: comparing a parse to its own PDF is fidelity, not correctness. → [full](docs/changelog/2026-09.md#2026-09-21--menus-wiped-price-quantity-bug-fixed-before-reload)

---

## Detailed Entries

### 2026-09-23 → 09-25 — BEO Parser: Three Silent Losses Found and Fixed

**File(s) Changed:** `supabase/functions/process-beo/beoGeometricParser.ts`
**Type:** `fix` — `process-beo` deployed v23→**v26**. Commits `9b2168b`, `3fc2286`,
`9f37624`. **Not pushed.**
**Summary:** Reported as "Gemini API timeout 500". The timeout was a symptom: the
geometric parser refused the 09-23 packet, and the Gemini fallback cannot finish a
42-page packet in 130s. Chasing it surfaced two more losses the gate had been passing.

**Details:**

- **v24 — a page with no label and no qty.** `SUMMARY: Homecoming Take Out` (10/03)
  prints a priced "One Dozen …  $26/Doz." menu with neither, so no item ever opened and
  all 24 lines vanished. The gate caught it (correctly); the fallback then timed out and
  took 33 good events down with it. An orphan centre line now opens an item. Kept as ONE
  block in print order — the page prints 9 prices for 8 dishes, so splitting would guess.
- **v25 — continuation pages were thrown away, on every packet since v22.** A BEO that
  runs onto page 2 continues its table there WITHOUT reprinting a section header. The
  assembler reset per page and waited for a Qty header; **the gate waited for the same
  header**, so it never looked either. Lost: Eurofins 09/24's entire plated dinner
  (courses, 53/3/4 entrées, desserts), Kid's Culinary Club's beverage station, ESS Golf
  Classic's bar, beverages and desserts. Table state now carries across an event's
  pages; a page reprinting the event header block (`Event Headcount` / `Start Date` /
  `Primary Contact`) still starts fresh. The first row below the page header is measured
  as a new row — read as a wrapped line it glued each page's opening category header
  onto the item before.
- **v26 — the gate matched by presence, so repeats vouched for losses.** Measured by
  deleting parts of real output one at a time and asking the gate: it missed **278 of
  1508** single lines and **33 of 596** items (Beverages x300, Plated Entrée x23). The
  most-missed lines were `per dozen`, `N pieces`, `serves N` — the order basis. Each
  printed line is now consumed once by a description line (counted); only category
  names keep containment. Misses: 13 lines / 3 items; **0 false alarms on 7 packets**.
  A continuation page missing its `Club Contact:` line is now refused outright.
- **Every version was checked the same way:** parse output diffed old-vs-new on every
  packet (all prior items identical; only recovered items added), then the DEPLOYED
  function's output compared byte-for-byte with the local run.
- **Data repaired.** The 09-23 packet was re-queued and approved; Eurofins, Kid's
  Culinary Club and ESS were re-queued as a 3-event import after v25 and approved —
  verified in `banquet_event_orders` (15 / 6 / 41 items).
- **Twice today the gate agreed with a broken parse because it shared the parser's
  premise** (waiting for a Qty header; "text appears somewhere"). A mutation test —
  delete, then ask the gate — is what measures a gate; a clean pass on real data can't.

**Open:**
- Events approved from packets BEFORE v25 may still be missing their page 2+. The PDFs
  are in `beo-emails`; a re-parse-and-diff against live rows is the next job.
- The Gemini fallback still cannot parse a full daily packet inside 130s.
- 3 items the gate still misses: a line whose text is also a category name in the event.
- The gate checks lines SURVIVE, not where they land — misgrouping passes (the SUMMARY
  block; "Course Two" absorbing its price note). The approval queue is the only check.

---

### 2026-09-23 → 09-26 — 15 Current Menus Loaded as Drafts; Parser v9

**File(s) Changed:** `supabase/functions/process-menu/index.ts`, `app/src/lib/menuDrafts.js`,
`app/src/pages/MenuDishes.jsx`, `supabase/migrations/20260923000000_menu_dishes_spring_summer.sql`,
`supabase/migrations/20260926000000_menu_dishes_price_unit_lb.sql` (both new),
`New Catering and Event Menus 2026/` (owner's current menus: 7 new, 4 replaced, 1 renamed)
**Type:** `fix` + `migration` — `process-menu` deployed v8→**v9**. **Not committed.**
**Summary:** The owner's corrected 2026 menu set (15 PDFs) was read, checked line by line
against the pages, the parser fixed where it was wrong, and **369 dishes loaded as
drafts**. Nothing is confirmed yet — the owner reviews in `/office/menus`.

**Details:**

- **Spring & Summer seasons.** The set added two seasonal menus; the table, the function
  and `menuSourceFromFilename` only knew fall/winter, so they would have filed as
  year-round menus named "Seasonal - Spring". All three now take four seasons.
- **Breakfast: two prices the parser invented.** The page prints four prices for five
  sandwiches; v8 stored Ham, Egg & Cheddar at **$6** (on the page nowhere; really $8) and
  gave the unpriced Gouda Croissant $8. v9 reads $8 and blank. A human gate still owns it.
- **Themed Buffets: 8 package prices lost.** "Southern BBQ $41" became 8 unpriced
  component rows (82 total). The one-package-one-dish rule lived only in the Word path;
  moved to the shared core (rule 10). Now 8 dishes, all prices matching the page, and the
  optional chicken swap stays in the description instead of ordering on top.
- **`lb` price unit** (migration + review dropdown): "$180 / 4lbs" was "$180 for 4" of
  nothing. The review page's own unit list needed it too, or editing the row blanks it.
- **Minimums count in the price's unit** — "2 dozen" beside a per-dozen price is 2, not
  24 (read as dozens, 24 is 12x). A station/package total is not a per-dish minimum.
- **"A or B" splits** into two dishes (owner's call), e.g. "Garden Salad or Caesar".
- **Gemini 503 retry**: 10 of 15 files failed first try on 09-23 with "high demand".
  Retries 503/429 within one 130s deadline; the v9 runs had no failures.
- **Verified three ways:** v9 parse diffed against v8 (every change accounted for, then
  re-checked on the page); deployed source compared with local; the loaded rows diffed
  against the checked parse — **every price identical**. The load is a fresh model read,
  so a few non-price details differ from the checked run (listed below).

**For the owner's review** (the parse matches the pages; whether the pages are right is
his call): Gouda Croissant has no price on the menu; the 6 pizzas carry min 30 each but
the minimum is station-wide (rule ignored — clear it); "Prosciutto, Tomato, Balsamic
Drizzle" loaded as a row but is Burrata Crostini's topping (Not a dish); Omelet Station
lost its "Minimum 20"; mark Additional Salad/side/dessert as price rules again (the wipe
cleared the flags). Menu typos: "HOR D'OEURVRES", "Angle Food Cake", "Paltters".

**Resolved from the entry above:** the re-check of events approved before `process-beo`
v25 was done by the owner and passed (2026-09-26).

---

### 2026-09-26 — Menu Review Complete; Three Corrections After Confirm

**File(s) Changed:** data only (`menu_dishes`) **Type:** `fix`
**Summary:** The owner confirmed all 369 drafts. A check of the confirmed rows found three
of the review items still open; corrected at his instruction.

**Details:**

- **Additional Salad / side / dessert** flagged `is_price_rule` — confirmed as food, they
  sat in `orderable_menu_dishes` and would have double-ordered in P3.
- **Pizza minimum**: `min_order` 30 cleared on all 6 pizza rows (it read as 30 of EACH);
  "Station minimum: 30 pizzas (any mix)" added to each description.
- **"Prosciutto, Tomato, Balsamic Drizzle"** deleted as a dish and appended to Burrata
  Crostini's description (it is that dish's topping — a stray bullet on the menu).
- Result: **368 dishes, all confirmed; 4 price rules; 364 orderable** for P3.

---

### 2026-09-26 — Change a Saved Schedule's Week; Parser Stops Guessing the Year

**File(s) Changed:** `app/src/pages/SchedulePage.jsx`, `supabase/functions/process-schedule/index.ts`,
`claudedocs/requirements_schedule_date_edit_2026-09-26.md` (new)
**Type:** `feature` + `fix` — `process-schedule` deployed v11→**v12**.
**Summary:** Schedule sheets print month/day but no year, and the parser was told neither
today's date nor the file name, so it guessed: **7 of 25 saved schedules were filed under
2020 or 2024**, and none existed for the current week (09-21) or the next (09-28). The page
opens the week nearest today, so a misdated schedule was effectively lost and re-uploaded.

**Details:**

- **Change Week** (office only, beside the trash button): the picked date snaps to its
  Monday and every shift moves by the same number of days (`handleChangeWeekDate`, helpers
  `mondayOf` / `addDaysTo` / `daysBetween`). A week that already has a schedule is refused
  by the existing `week_start` UNIQUE constraint (`23505`) with a message; nothing changes.
- **Realtime follows a moved schedule** — the old week no longer exists, so an UPDATE
  whose row id is the one on screen now loads the row's new week instead of falling back
  to "nearest today".
- **Parser gets today's date** (America/Chicago) and is told to pick the year closest to
  it. File names were rejected as the signal: `photo_2026-09-26_…` is when the photo was
  taken, not the week, and `IMG8389….jpg` has no date at all.
- **Review modal**: week picker snaps to Monday; a red warning shows when the week is more
  than 30 days from today (`WEEK_WARNING_DAYS`).
- **Verified:** the two misdated uploads re-parsed through deployed v12 → 2026-09-28 (was
  2020) and 2026-09-21 (was 2024), shifts inside the week; one run each. In the browser a
  junk 2024 row was moved via a Thursday (snapped to Monday; DB showed all 25 shifts
  03-04→03-10), refused onto 2026-09-14 with the message, then moved back — `md5` of its
  `schedule_data` identical to before. Phone width: editor wraps, no horizontal scroll.
  `npm run build` passes.
- **Not browser-tested:** the review-modal warning and Monday snap — they only render
  after a real upload, which writes files to storage. The next real upload exercises them.

**Open:** the 7 misdated rows are left for the owner to fix with the new button (his call):
move 2020-09-28 → 2026-09-28 and 2024-09-21 → 2026-09-21, delete the duplicate 2024-10-21
upload and the four small 2024 test rows. Until then the crew sees 09-14 as "this week".

---

### 2026-09-27 — Menu Follow-ups: Prompt Test Committed, Entrée Units, Design Doc

**File(s) Changed:** `supabase/functions/process-menu/prompt_test.ts` (new),
`claudedocs/design_beo_order_guide_2026-09-15.md`, `docs/changelog/2026-09.md`, data (`menu_dishes`)
**Type:** `refactor` + `fix` — findings 1, 3, 4 of the 09-26 validation pass.
**Summary:** The prompt check now lives in the repo instead of a session scratch folder,
the seasonal plated entrées carry one consistent unit, and the design doc says what was
actually built.

**Details:**

- **`prompt_test.ts`** (`deno test --allow-read supabase/functions/process-menu/prompt_test.ts`):
  slices the prompt out of the REAL `index.ts` and asserts every rule 1-12 is present and
  in order, the source rules land as rule 2, and the unit list matches the table's CHECK.
  The harness had been lost with the scratch folder twice. **Measured by mutation, not by
  a clean pass:** 6/6 on the real file; renaming rule 11, renumbering rule 10, dropping
  `lb`, and splicing rule 2 after rule 3 each fail exactly 2 tests. Not bundled on
  deploy (only what `index.ts` imports ships).
- **13 seasonal "Composed Plated Entrées"** (Fall 5, Spring 4, Winter 4) set to
  `price_unit = person`, matching Summer. Label consistency only; no price changed.
- **Design doc** marked superseded where it still said `season` is null/fall/winter with
  `effective_start`/`effective_end` (dropped 2026-09-18; spring/summer added 09-23).
- **Archive:** the 09-19 "Additional Salad" entry moved verbatim to `docs/changelog/2026-09.md`
  to keep this file under 500 lines. The first attempt searched for LF separators in a
  CRLF file, took 212 lines (four entries) and left no summaries — caught by the line
  count, restored from git, redone with a one-entry guard.

---

### 2026-09-27 — Week of 09-28 Schedule Re-dated from 2020

**File(s) Changed:** data only (`schedules` row `5352d2bf…`) **Type:** `fix`
**Summary:** The current week's schedule had `week_start` 2026-09-27 (a Sunday) while all 115
shifts were still dated 2020-09-28 → 10-04, so the grid (days built from `week_start`,
shifts matched by exact date) had nothing to show. Fixed at the owner's instruction.

**Details:**

- `week_start` → **2026-09-28** (Monday); every shift date + 6 years, order preserved.
  2020-09-28 and 2026-09-28 are both Mondays, so each shift keeps its weekday.
- Verified: 115 shifts, Mon 9/28 → Sun 10/4 (9/13/16/20/21/20/16), 5 announcements intact.
- The Change Week button could not do this: it shifts by `week_start`'s gap (1 day here),
  which would have left the shifts in 2020.
- Left as-is by the owner's choice: the past 9/21 week (filed as `2024-09-21`, a Saturday),
  the `2024-10-21` duplicate and four small 2024 test rows. Not worth fixing now that the week is over.

---

### 2026-09-27 — Drift Audit: Every Deployed Function vs the Repo; Advisors; Migration History

**File(s) Changed:** none in code, data or deploys — `CHANGES.md`, `docs/changelog/2026-09.md`,
`CLAUDE.md`, memory. **Type:** read-only audit.
**Summary:** Checked that what runs in production is what the repo says. It mostly is; the
exceptions are listed below, and each fix is the owner's call.

**Details:**

- **P3 work in the tree (written ~3am, unlogged, still UNCOMMITTED) matches live exactly.**
  `draft-dish-specs` v2 = local `index.ts`; `20260927000000_create_dish_specs.sql` holds BOTH
  applied migrations (`create_dish_specs` + `dish_ingredient_names`) — all 5 function bodies
  hash-equal live, tables/views/policies present, `orderable_menu_dishes` now carries
  `price_qty` + `spec_*`. Data: 364 orderable dishes all `spec_status = none`, 0
  `dish_ingredients`, 0 `ingredient_products`. `npm run build` passes.
- **All 15 deployed edge functions diffed against the repo:** 12 identical;
  `categorize-recipe` and `receive-beo-email` differ in comments/whitespace only.
  **`generate-schedule` v17 = `auto-scheduler` commit `7dfe506` (07-02)** — the 08-03
  double-book/fairness fix (`16318f6`) and pins & quotas (`86045f5`) were never deployed.
  **`parse-recipe` is deployed with no source on any branch and no caller in the app.**
- **Frontend:** Vercel production = `origin/main` = `04d8396`, 28 commits behind `main`. It
  never references `menu_dishes`, so the backend changes since cannot have broken it.
- **Advisors:** `handle_new_user` (trigger on `auth.users`) inserts into `public.profiles`,
  **which does not exist** — any Supabase Auth sign-up would fail; not in the repo.
  `rls_auto_enable` (event trigger `ensure_rls`) turns RLS on for every new public table —
  not in the repo either. `orderable_menu_dishes` has been SECURITY DEFINER since 09-19; no
  real exposure (`menu_dishes` is allow-all). "Anon can execute" on the two trigger functions
  is moot — Postgres will not call a trigger function directly. 11 of the 12 mutable
  `search_path` warnings are SECURITY INVOKER functions.
- **Migration history cannot rebuild prod:** only 3 of 54 applied migrations match a repo
  file by version+name; ~19 applied (mostly March–May) have no file on any branch; 9 repo
  files were never applied under their own name; pre-migration base tables were never in
  the repo. **Never `supabase db push` / `db reset`.** The scrapped `event_tasks.portion`
  column is confirmed gone.
- `config.toml` lacks `get-weather` and `generate-order-items` (deployed `verify_jwt=false`).
  `supabase/functions/generate-schedule/llm.ts` on `main` is dead (old design, swept in by
  a 07-25 docs commit, imports a file that does not exist on `main`).
- **Method:** `SUPABASE_ACCESS_TOKEN` still 401s, so deployed source came from the MCP's
  `get_edge_function`, copied to scratch and diffed with CR and trailing whitespace
  ignored — copying drops trailing spaces, which showed as false diffs until normalised.
  Outputs too large to return inline land as JSON on disk and were extracted by script.

**Open (owner's call):** commit P3; drop the `handle_new_user` trigger (or create
`profiles`) before real auth; `orderable_menu_dishes` → `security_invoker`; add the two
`config.toml` entries and delete `llm.ts`; snapshot the live schema into the repo (needs
`supabase login`); deploy `16318f6` after a re-test; keep or delete `parse-recipe`.

---

### 2026-09-27 — Dish Specs + Ingredient Mapping Built (order guide P3) — logged late

**File(s) Changed:** `supabase/migrations/20260927000000_create_dish_specs.sql`,
`supabase/functions/draft-dish-specs/index.ts`, `supabase/config.toml`,
`app/src/pages/DishSpecs.jsx`, `app/src/pages/IngredientProducts.jsx`,
`app/src/lib/orderUnits.js`, `app/src/lib/useKeyboardReview.js`, `app/src/App.jsx`,
`app/src/components/OfficeLayout.jsx`, `app/src/pages/MenuDishes.jsx`, `app/src/index.css`
**Type:** `feature` + `migration` — built in the early hours of 09-27, deployed
(`draft-dish-specs` v2, both migrations applied) but not logged or committed until now.
**Summary:** The P3 half of the order guide: what one serving of each confirmed dish is
made of, and which catalog product each ingredient is bought as. Same shape as P2 — a
model drafts, a human confirms, nothing downstream reads a draft. **Built, not yet run:**
0 dishes specced, 0 ingredients mapped.

**Details:**

- **Schema:** `menu_dishes` gains `spec_basis` / `spec_status` / `spec_note` /
  `spec_confirmed_at`; new `dish_ingredients` (portion per ONE basis unit, `oz|lb|floz|each`
  only) and `ingredient_products` (one catalog product per ingredient name, confirm once).
  RPCs `save_dish_spec` (refuses a non-orderable dish), `save_dish_spec_drafts` (never
  overwrites a confirmed spec), `upsert_ingredient_product_drafts`, `dish_ingredient_names`,
  `dish_spec_progress`; views `dish_ingredient_lines`, `ingredient_usage`. Re-running the
  `orderable_menu_dishes` definition also restored its missing `price_qty` column.
- **`draft-dish-specs`** (`verify_jwt=false`, gemini-3-flash-preview, no temperature —
  temperature 0 looped into the 130s deadline): mode `ingredients` (≤12 dishes; basis is
  DERIVED from the dish, never asked of the model) and mode `products` (≤60 names against
  the paged 1,381-product catalog; an invented product number becomes null with a reason).
- **Owner decisions (migration header):** raw ingredients as purchased; themed buffets
  specced flat per guest; flavour-choice dishes as the shared base with `spec_note`.
- **Pages:** `/office/dish-specs` ("Dish Ingredients") and `/office/ingredients`
  ("Ingredient Products"). `orderUnits.js` holds the pure portion→pack arithmetic P4 will
  reuse (no cross-class conversion — a gap with a reason). The keyboard review moved out of
  `MenuDishes.jsx` into the shared `useKeyboardReview.js`; all three reviews use it.
- **Verified:** deployed function and applied migrations byte/hash-identical to these files
  (see the drift-audit entry); `npm run build` passes. **Not browser-tested.**

---

### 2026-09-27 — Orphan Sign-up Trigger Dropped; orderable_menu_dishes Runs as Caller

**File(s) Changed:** `supabase/migrations/20260927010000_drop_orphan_handle_new_user.sql`,
`supabase/migrations/20260927010001_orderable_menu_dishes_security_invoker.sql` (both new)
**Type:** `migration` — applied to prod (recorded as `20260928040925` / `…040929`).
**Summary:** Items 2 and 3 from the drift audit, at the owner's instruction.

**Details:**

- **Dropped `on_auth_user_created` + `public.handle_new_user()`**: an AFTER INSERT trigger on
  `auth.users` writing to a `public.profiles` table that does not exist, so any Supabase
  Auth sign-up would have failed. Never in the repo. The exact dropped definitions are kept
  in the migration file. The one existing auth user is untouched.
- **`orderable_menu_dishes` → `security_invoker = on`**, matching the two views that read
  through it. Verified as the `anon` role: 364 rows before and after, equal to the base
  table. The linter's only ERROR is gone; 11 low-risk warnings remain.
- **Trap proven, not assumed:** in a rolled-back transaction, `CREATE OR REPLACE VIEW`
  without a `WITH` clause reset `security_invoker` to nothing — any redefinition of this
  view must repeat `with (security_invoker = on)`.
