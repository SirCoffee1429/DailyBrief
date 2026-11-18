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
> recovering them into `docs/changelog/` is an open job. 07-11 → 08-06 were recovered
> 2026-10-27; the rest are not yet done.
>
> **Consolidated 2026-06-12.** Entries before the auto-scheduler work (2026-06-10)
> were condensed to one line each. A duplicated block of April 2026 entries was
> removed during that pass.
>
> **Open Threads (added 2026-11-16)** is the one list of everything unfinished, across features. Rewrite it at every
> `/sc:save`: closed items come OFF (their story stays in the entries below), new ones go on, figures are re-checked.

---

## Open Threads (last checked 2026-11-17, after Task 5's real answers)

- **Not pushed:** local `main` is **98 commits** ahead of `origin/main` (production;
  `git rev-list --count origin/main..main`). Not live yet:
  - catalog (P1), menus incl. .docx (P2), dish specs + ingredient products (P3);
  - the product on each order row (step A), order guide B Tasks 0–5;
  - changing a saved schedule's week;
  - the npm audit fixes and SheetJS 0.20.3.

  Edge Functions and database changes deploy separately and ARE live. Pushing is Ryan's call.
- **Order guide B:** Task 5 DONE (all 4 checks passed on Ryan's real answers, 11-16). Next: T6 Part of / Its own
  dish, T7 Change match, Checkpoint C, T8. Status in `tasks/todo.md`.
- **BEO parser heading fix (11-17): built + tested, NOT deployed.** A heading must now be in the `Qty` cell's font;
  on 10 packets exactly the 7 misreads change (282 events identical). Left: deploy `process-beo` v27 (ask) →
  re-import Screaming Eagle 11/17 (ask; live row still has the dessert as a category). Not touched: header lines
  that carry a qty ("Themed Buffets | 1") become item text, and the gate's category-name containment hole.
- **BEO PDFs downloaded 11-16:** 8 packets (member contact details) in the gitignored `BEOs/`. Ryan to say whether
  to delete them after the parser work.
- **Prep Sheets cleanup (Ryan's call):** back up and move aside `prepsheets/` (still in the repo root); remove the
  worktree `../DailyBrief-prep-sheets`. The branch is fully merged.
- **Parked by Ryan:**
  - case yields / order quantities (`claudedocs/design_p4_case_yield_2026-10-25.md`);
  - the Prep Sheets Completed tab + 3-day log;
  - the auto-scheduler: branch `auto-scheduler` is local only, 5 commits of its own and 183 behind main. Production
    stays `generate-schedule` v17; the newer solver and pins/quotas are not deployed.
- **Waiting on input:** the spring, summer and winter recipe books. Redraft each season's dishes from its book when it
  arrives.
- **Known, not fixed:**
  - step A picks `diced tomatoes` → fresh (likely canned) and `shredded mozzarella` → pearls;
  - 12 `toISOString()` dates in `app/src` (UTC, flips at 7pm Central);
  - recipe editor gaps (deferred 10-19);
  - one long PFG word overflows the order row's note column at 375px;
  - the lines-to-match box repeats each line's whole BEO item (long at phone width); offered to show only the line above;
  - quantity lines ("Quart", "Dozen", "Serves 6-8 People") are asked in the box instead of read as notes;
  - two "Cheesecake" dishes on From the Bakery (Plated Desserts), 9 and 7 lines;
  - recovering the pre-09-08 changelog entries (see above).

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

- 07-11 — Fix: Restore Invisible Delete/Edit Buttons on Events Page (`.wb-act-btn` scoped to `.wb-note`) → [full](docs/changelog/2026-07.md#2026-07-11--fix-restore-invisible-deleteedit-buttons-on-events-page)
- 07-12 — FOH Sidebar Layout + Cyan Theme Fix (`.foh-v2`) → [full](docs/changelog/2026-07.md#2026-07-12--foh-sidebar-layout--cyan-theme-fix)
- 07-17 — Prep List Portion Scaling: built, deployed, then scrapped; only the flash-model swap kept (`23332a2`) → [full](docs/changelog/2026-07.md#2026-07-17--prep-list-portion-scaling-built-deployed-then-scrapped-perf-change-kept)
- 07-19 — Stacked Same-Day Briefings + Attribution + Local-Date Fix (`lib/dates.js` added) → [full](docs/changelog/2026-07.md#2026-07-19--stacked-same-day-briefings--attribution--local-date-fix)
- 07-19 — Fix: Upcoming Banquets Dropped the Current Day After 7pm (UTC rollover) → [full](docs/changelog/2026-07.md#2026-07-19--fix-upcoming-banquets-dropped-the-current-day-after-7pm)
- 07-22 — Fix: Evening Briefings Vanished Next Day (`defaultBriefingDate()` 5pm cutoff) → [full](docs/changelog/2026-07.md#2026-07-22--fix-evening-briefings-vanished-next-day-smart-date-default)

### August 2026

- 08-03 — Claude Code health check: extension cleanup + CLAUDE.md trim → [full](docs/changelog/2026-08.md#2026-08-03--claude-code-health-check-extension-cleanup--claudemd-trim)
- 08-04 — Separate the auto-scheduler branch from main's housekeeping → [full](docs/changelog/2026-08.md#2026-08-04--separate-the-auto-scheduler-branch-from-mains-housekeeping)
- 08-05 — Office Notification Bell (time off + availability) → [full](docs/changelog/2026-08.md#2026-08-05--office-notification-bell-time-off--availability)
- 08-06 — Time Off Approval Workflow + Sidebar Approval Badges → [full](docs/changelog/2026-08.md#2026-08-06--time-off-approval-workflow--sidebar-approval-badges)
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
- 09-23→25 — BEO Parser: Three Silent Losses Found and Fixed (`process-beo` v26) — a "Gemini timeout 500" was the gate rightly refusing a packet the fallback cannot finish in 130s. v24: a centre line with no label and no qty opens an item (SUMMARY take-out page lost 24 lines). v25: **page 2+ of a BEO continues its table with no section header** — every multi-page BEO since v22 had lost it (Eurofins' whole plated dinner). v26: the gate now CONSUMES each printed line once; matching by presence missed 278/1508 deleted lines. Lesson: measure a gate by mutation, not by clean passes. → [full](docs/changelog/2026-09.md#2026-09-23--09-25--beo-parser-three-silent-losses-found-and-fixed)
- 09-23→26 — 15 Current Menus Loaded as Drafts; Parser v9 (`process-menu` v9) — the owner's corrected 2026 set, 369 drafts. Fixed: spring/summer seasons, an `lb` price unit, minimums counted in the price's unit, "A or B" splits, themed-buffet packages kept as ONE dish (8 prices had been lost), and two Breakfast prices the model **invented**. Gemini 503s retried within one 130s deadline. Every loaded price matched the checked parse. → [full](docs/changelog/2026-09.md#2026-09-23--09-26--15-current-menus-loaded-as-drafts-parser-v9)
- 09-26 — Menu Review Complete; Three Corrections After Confirm — owner confirmed all 369 drafts; a check of the CONFIRMED rows found three review items still open: Additional Salad/side/dessert re-flagged `is_price_rule` (would have double-ordered), pizza `min_order` 30 cleared (read as 30 of EACH), a stray topping bullet folded into Burrata Crostini. Result 368 confirmed / 364 orderable. → [full](docs/changelog/2026-09.md#2026-09-26--menu-review-complete-three-corrections-after-confirm)
- 09-26 — Change a Saved Schedule's Week; Parser Stops Guessing the Year — schedule sheets print no year and the parser guessed: **7 of 25 schedules filed under 2020/2024**. Office "Change Week" moves every shift by the same days (snaps to Monday, refused onto an occupied week); `process-schedule` v12 is told today's date (Chicago). File names rejected as the signal (photo date ≠ week). → [full](docs/changelog/2026-09.md#2026-09-26--change-a-saved-schedules-week-parser-stops-guessing-the-year)
- 09-27 — Menu Follow-ups: Prompt Test Committed, Entrée Units, Design Doc — `process-menu/prompt_test.ts` committed: slices the prompt out of the real `index.ts` and checks rules 1-12 in order (6/6, and four mutations each fail it). 13 seasonal plated entrées set to `price_unit = person` like Summer — a label only, no price changed. Design doc's old `season`/`effective_*` model marked superseded. → [full](docs/changelog/2026-09.md#2026-09-27--menu-follow-ups-prompt-test-committed-entrée-units-design-doc)
- 09-27 — Week of 09-28 Schedule Re-dated from 2020 — `week_start` was a Sunday and all 115 shifts sat in 2020, so the grid showed nothing; moved to Monday 2026-09-28, every shift +6 years (weekdays preserved). Change Week could not do it (it shifts by `week_start`'s gap). Past misdated weeks left as-is by the owner. → [full](docs/changelog/2026-09.md#2026-09-27--week-of-09-28-schedule-re-dated-from-2020)
- 09-27 — Drift Audit: Every Deployed Function vs the Repo — 12/15 edge functions identical; `generate-schedule` v17 = `auto-scheduler` `7dfe506` (later fixes never deployed); `parse-recipe` deployed with no source. Orphan `handle_new_user` trigger would break any sign-up. **Migrations cannot rebuild prod** (3 of 54 match) — never `db push`/`db reset`. → [full](docs/changelog/2026-09.md#2026-09-27--drift-audit-every-deployed-function-vs-the-repo-advisors-migration-history)
- 09-27 — Dish Specs + Ingredient Mapping Built (order guide **P3**, logged late) — `dish_ingredients` (portion per ONE basis unit, oz/lb/floz/each) + `ingredient_products` (confirm once); `draft-dish-specs` drafts both, basis DERIVED from the dish, never asked. Pages `/office/dish-specs` + `/office/ingredients`; `orderUnits.js` holds the P4 arithmetic. → [full](docs/changelog/2026-09.md#2026-09-27--dish-specs--ingredient-mapping-built-order-guide-p3--logged-late)
- 09-27 — Orphan Sign-up Trigger Dropped; `orderable_menu_dishes` Runs as Caller — dropped `handle_new_user` (wrote to a nonexistent `profiles`). View set `security_invoker`; proven in a rolled-back transaction that CREATE OR REPLACE VIEW without a WITH clause silently resets it. → [full](docs/changelog/2026-09.md#2026-09-27--orphan-sign-up-trigger-dropped-orderable_menu_dishes-runs-as-caller)
- 09-27 — config.toml Covers Every Deployed Function — `get-weather` + `generate-order-items` added with `verify_jwt = false` (a default redeploy could have flipped them); all 16 match. Dead pre-hybrid `generate-schedule/llm.ts` deleted from `main`. → [full](docs/changelog/2026-09.md#2026-09-27--configtoml-covers-every-deployed-function-dead-llmts-deleted)
- 09-28 — Drift-Audit Decisions — `parse-recipe` deleted from prod after archiving its source (`docs/archive/edge-functions/`). Scheduler: nothing deployed or removed — Crew Availability (31 people) and Roster are in real use; `generate-schedule` v17 left deployed by the owner's choice. → [full](docs/changelog/2026-09.md#2026-09-28--drift-audit-decisions-parse-recipe-deleted-scheduler-left-as-is)
- 09-28 — Schema Baseline in the Repo — `supabase/schema_baseline.sql` = `db dump` of prod's structure (32 tables, 3 views, 12 functions, 52 policies — all counts verified). Event trigger `ensure_rls` is not in a dump; its definition sits in the header. The CLI 401s were a stale `SUPABASE_ACCESS_TOKEN` env var. → [full](docs/changelog/2026-09.md#2026-09-28--schema-baseline-the-live-databases-structure-is-now-in-the-repo)
- 09-30 — Purchase History: Matcher Prefers What the Kitchen Buys — PFG worksheet loaded (631 products dated, 611 updated / 20 added); its prices deliberately NOT taken (catch-weight = per-lb, 20–50x low as case prices). Matcher v3 lists bought products first (`BOUGHT <date>`). First CLI deploy: it stores compiled JS. → [full](docs/changelog/2026-09.md#2026-09-30--purchase-history-ingredient-matching-prefers-what-the-kitchen-buys)

### October 2026

- 10-01 — Ingredient Products Shows Which Dishes Use Each Ingredient — `ingredient_usage.dishes` (name, menu, season, portion; 122/122 rows checked); `BASIS_LABEL` shared via `orderUnits.js`. → [full](docs/changelog/2026-10.md#2026-10-01--ingredient-products-shows-which-dishes-use-each-ingredient)
- 10-01 → 10-03 — Product Matcher Sees Each Ingredient's Dishes; Miscopied Numbers Caught — dish lines + `with:` companions (scallops picked pre-made 2/3 → 4/5 right); Bacon-Wrapped Scallops IS bought pre-made (owner); a pick stands only if its copied description matches its number, digit-words exact (`match_test.ts`). v3 → v8; 122/122 matches confirmed. → [full](docs/changelog/2026-10.md#2026-10-01--10-03--product-matcher-sees-each-ingredients-dishes-miscopied-numbers-caught)
- 10-06 — Office Time Off: Remove a Request From the Calendar (shipped on its own, `461f12a`) — office clicks a calendar name → named confirm → delete; `deleteRequest` now checks a row was really removed before notifying. Shipped alone via a branch off `origin/main`, merged back (not rebased). Owner tested it; live removals followed. → [full](docs/changelog/2026-10.md#2026-10-06--office-time-off-remove-a-request-from-the-calendar-shipped-on-its-own)
- 10-07 — Dish Spec Review: Wings, Burrata, Whole Fruit, Sourdough Slices, Stale Notes — wings 1 per piece, burrata added (#355554), whole fruit = 12 gala apples/dozen, stale AI notes cleared; coconut shrimp + Wellington are buy-outs. Found `unitFit`'s pack-count guess (coconut shrimp ~54x over) → folded into P4. 55/364 confirmed, 158/158 ingredients mapped. → [full](docs/changelog/2026-10.md#2026-10-07--dish-spec-review-wings-burrata-whole-fruit-sourdough-slices-stale-notes)
- 10-08 — Dish Drafter Stops Swapping Foods (v8 → v11) — it read its EXISTING NAMES list as the only foods allowed (tenderloin → shoulder tender, 0 new names in bad runs). Rules 11-12 (new names expected, never substitute); telling the model to keep swaps out of its note made them SILENT, so that was removed. → [full](docs/changelog/2026-10.md#2026-10-08--dish-drafter-stops-swapping-foods-draft-dish-specs-v8--v11)
- 10-09 — Drafter: Dijon Kept Separate, Batches of 4, Repeatable Check in the Repo — `draft-dish-specs` v12: Dijon is never grain mustard (owner). The rule alone failed inside a batch; **batch size is the lever** (12 → swaps, 8 → 2 runs with swaps, 4 → 0 in 12 runs), so `DRAFT_BATCH` 8 → 4. `drafter_check.ts` scores the deployed function N times and exits 1 on any swap. → [full](docs/changelog/2026-10.md#2026-10-09--drafter-dijon-kept-separate-batches-of-4-repeatable-check-in-the-repo)
- 10-10 — Drafter Retries Malformed JSON Once; Beef Tenderloin Respecced — v13: a non-JSON reply is retried ONCE inside the same 130s budget (API errors/timeouts are not); `retry_test.ts` 4/4, mutation-checked. Owner: "tenderloin should be tenderloin" — Action Stations moved off `shoulder tender`. → [full](docs/changelog/2026-10.md#2026-10-10--drafter-retries-malformed-json-once-beef-tenderloin-respecced)
- 10-10 — Time Off Calendar: Days Line Up Under Their Weekday Again (shipped on its own, `21cee39`) — not a date bug: the weekday header and day grid are separate `repeat(7, 1fr)` grids and long names widened their column; both now `minmax(0, 1fr)`, checked 7/7 header-cell alignment on the live page. → [full](docs/changelog/2026-10.md#2026-10-10--time-off-calendar-days-line-up-under-their-weekday-again)
- 10-13 — Office Tasks Tab: Add Kitchen Tasks Without a Briefing (shipped on its own, `7ac0e01`) — `briefing_tasks.briefing_id` nullable + a `date`; the office Tasks tab adds a kitchen task for a day, shown on the kitchen dashboard; BOH only. Merged back as `b378678`. → [full](docs/changelog/2026-10.md#2026-10-13--office-tasks-tab-add-kitchen-tasks-without-a-briefing-shipped-on-its-own)
- 10-14 — Seasonal Recipe Books Drive the Dish Drafter; Fall Drafted From the Book — `house_recipes` (30 fall recipes, title → ingredients only; methods unchecked) + `dish_house_recipes()`; drafter v13 → v21: the model COPIES whole batches, code computes every share off the book (model sums −34%, shares 25x off); buffet entrées × 0.65. 18 fall dishes drafted, 37 shares hand-checked; `house_recipe_test.ts` 12 cases, 13 mutations caught. → [full](docs/changelog/2026-10.md#2026-10-14--seasonal-recipe-books-drive-the-dish-drafter-fall-drafted-from-the-book)
- 10-15 → 10-16 — Ingredient Products: Search, and Split Dishes Off to Another Name; Eggs Fixed — one NAME = one product for every dish, so a wrong match is fixed by SPLITTING dishes to another name, never re-picking. Split refuses clashes by name, checks moved = ticked, and no match outlives its last dish. Data: `egg patty` (4 sandwiches) vs `egg` (77 dishes → shell eggs); orphan peanut/raisin matches deleted. `626f9ee`. → [full](docs/changelog/2026-10.md#2026-10-15--10-16--ingredient-products-search-and-split-dishes-off-to-another-name-eggs-fixed)
- 10-17 — Owner Finished the Spec and Ingredient Review; Spring–Winter to Be Redrafted From Their Books — ALL 364 orderable dishes confirmed, 373 ingredient names (325 to a product), 0 orphans: P3 data complete. Spring/summer/winter (83 dishes) were specced WITHOUT books → redraft each season from its book when it arrives (owner). → [full](docs/changelog/2026-10.md#2026-10-17--owner-finished-the-spec-and-ingredient-review-springwinter-to-be-redrafted-from-their-books)
- 10-17 → 10-19 — P3 Completion Check: the Costing Arithmetic Hand-Checked; Wrong Cheese, Apple, Lamb and Hot Dog Matches Fixed — shipped `specCost` matched hand math on 3 dishes to 4 places; checking their lines found cubed-cheese packs on shredded/sliced names, Fuji on gala, a lamb leg on rack of lamb — all split/re-picked (owner). 364/364 confirmed, 0 orphans. P4 faces it: only 78 of 364 dishes cost fully (unit conversion per mapping). → [full](docs/changelog/2026-10.md#2026-10-17--10-19--p3-completion-check-the-costing-arithmetic-hand-checked-wrong-cheese-apple-lamb-and-hot-dog-matches-fixed)
- 10-19 → 10-25 — P4 Slice 1 (Case Yield): Requirements, Owner Data Fixes, Design — then PARKED — per-ingredient CASE YIELD (usable, typed by the owner, no drafts: rules would have drafted 9 of 30 wrong), `unitFit`'s pack-count guess to go, re-pick clears it. 517 lines / 101 names need a yield; 88 dishes cost fully. Owner fixed celery, cayenne, breadsticks, corn syrup, Bourbon Pecan Pie. Parked 10-25 for products-first. → [full](docs/changelog/2026-10.md#2026-10-19--10-25--p4-slice-1-case-yield-requirements-owner-data-fixes-design--then-parked)
- 10-25 → 10-26 — "Generate from BEO" Shows the Catalog Product Behind Each Item (step A) — owner re-sequenced: products on the order list first. `event_order_items.product_id` (ON DELETE SET NULL); `productsForItemNames` reads CONFIRMED matches only: exact → singular/plural → leading prep words dropped (fixed list, "fresh"/"whole" out). A hand pick is that BEO row only. Homecoming Dinner 26/28. Known wrong: diced tomatoes → fresh, shredded mozzarella → pearls. → [full](docs/changelog/2026-10.md#2026-10-25--10-26--generate-from-beo-shows-the-catalog-product-behind-each-item)
- 10-31 → 11-01 — Old Skill Bundle Removed; Five Vendored Skills and Live-Safety Permissions Added — owner removed the everything-claude-code bundle (`2968f78`); 5 skills vendored by hand from pinned commits (`dcfd7e6`, never `npx skills add`); `.claude/rules/skills-and-live-safety.md` (ask before live SQL, deploys, push, installs); `settings.json` 13 "ask" rules that override any local allow; 15 risky allows removed from `settings.local.json`. → [full](docs/changelog/2026-10.md#2026-10-31--11-01--old-skill-bundle-removed-five-vendored-skills-and-live-safety-permissions-added)


### November 2026

- 11-02 → 11-04 — agent-skills Workflow + Vitest; npm Audit to 0 (SheetJS From Its CDN) — `addyosmani/agent-skills` vendored by hand (`3528bdd`: 25 skills, 4 agents, 9 commands; `/plan-tasks`, `/review-change`; no `/build auto`; superpowers OFF here); Vitest (`npm test`, dates 9/9); `npm audit fix` (`3107002`, lockfile only — needs a separate `npm install`); xlsx pinned to the SheetJS CDN 0.20.3 tarball (`41c59ce`, never `npm i xlsx`), audit 0; old vs new SheetJS identical on 28 files except CRLF → LF in cells. → [full](docs/changelog/2026-11.md#2026-11-02--11-04--agent-skills-workflow--vitest-npm-audit-to-0-sheetjs-from-its-cdn)

---

## Detailed Entries

### 2026-11-04 — Specs Save to `spec/<feature>.md`, Matching CLAUDE.md

**File(s) Changed:** `.claude/commands/spec.md`, `.claude/commands/plan-tasks.md`,
`.claude/skills/spec-driven-development/SKILL.md`, `.claude/skills/VENDORED_SKILLS.md` **Type:** `config`
**Summary:** The vendored pack saved specs as `SPEC.md` (or `SPEC-<module>.md`) in the project root; CLAUDE.md says
`spec/<feature>.md`. Save paths changed to match. Owner's condition: paths only, no loss of function.

- `/spec` saves to `spec/<feature>.md` (creates `spec/`); `/plan-tasks` reads it from there; the skill's multi-module
  case saves the capability map and module specs in `spec/`.
- Checked first: nothing else in `.claude/` (commands, agents, skills, references) reads a spec by path; `/build` reads
  `tasks/todo.md`, unchanged. No `SPEC.md`, `spec/` or `tasks/` existed, so nothing to move.
- Logged as a local edit in `VENDORED_SKILLS.md` so a future upstream re-copy re-applies it. Committed `7010efc`, not pushed.

---

### 2026-11-04 → (in progress) — Station Prep Sheets, Built on Its Own Ship Branch

**File(s) Changed:** on branch `prep-sheets` (worktree `../DailyBrief-prep-sheets`, off `origin/main` `7ac0e01`):
`spec/prep-sheets.md`, `tasks/plan.md`, `tasks/todo.md`, `app/src/lib/prepSheets.js` + test, `app/package.json`/lockfile
**Type:** `feature` — in progress, **not pushed**; ships alone (push `prep-sheets:main`, then merge back here).
**Summary:** The five paper station prep sheets (`prepsheets/`, Fall 26) become one running list per station: on-hand vs
par, automatic Red <50% / Yellow <75% / Green, to-prep, Done/Partial, notes, Finish count, all live. Plus an office
overview ranked by 2 × red + yellow, a Kitchen dashboard tile, setup editing and spreadsheet upload. Spec approved 11-04.

- **T1 `bad3fd0`:** `parsePar`/`colorFor`/`toPrep`/`quickValues`/`stationScore`, 79 tests covering every real par.
  Vitest 5.1.0 added to the branch (Ryan's OK) so tests run where the code ships.
- **T2 `dddb1fd`:** `lib/prepSheetUpload.js` reads a sheet into preview lines (station name from the file name; blank-par
  row = section only if the next line has a par; typo fixes). 172 items across the five sheets, 0 unparsed; 112 tests.
- **T3:** migration `20261105174946_prep_sheets` **applied to prod 11-05 (Ryan's OK)**: 4 tables, 8 policies, realtime on 3,
  RPCs `prep_record`/`prep_finish_count`/`prep_replace_station`. Smoke test passed before and after (as anon), and left 0 rows.
- **T4 `1ee44a8`:** `/office/prep/setup`: station list + upload preview (Section/Item switch, unreadable pars flagged) →
  Confirm → `prep_replace_station`. Browser-checked on a throwaway `ZZ Test` station (still in prod, retired at the end).
- **Fall 26 loaded into prod (11-05, Ryan's OK)** through the page: Fry 27 / Grill 12 / Lunch 63 / Salad 51 / Sautee 19 = 172
  items, SQL-checked against the hand count. Not visible on the live site until the code ships.
- **T5 `7ce378b`:** `/kitchen/prep` (Kitchen nav "Prep Sheets"): station tabs, then each line with par, Have box + Out/¼/½/¾/Full,
  color chip and "prep N unit". Every count saves at once via `prep_record`, under a roster name remembered on the device.
  Browser-checked on `ZZ Test` at 375px (Salmon 4/12/15 → Red/Yellow/Green, reload keeps counts + name); 144 tests.
- **T6 `8175acf`:** Done (= par) / Partial (+ made) / note (edit, clear) per line with "name, time" of the last change;
  station header "Last count: End of Night, Ryan Coffee, 10:36pm" + Finish count picker. Line split to `PrepLine.jsx`; 157 tests.
- **T7 `fd26efe` (11-06):** live updates per open station; a Have box being typed in is never overwritten. Checkpoints
  B and C passed (Ryan). **T8 `859c3cf`:** `/office/prep` overview, ranked, live. **T9 `181507c`:** dashboard tile (11-07).
- **T10 `835d3d0`:** Setup "Edit a station" (stations, sections, items: rename/move/re-par/retire/add). **11-08 Checkpoint D
  fixes (Ryan):** office name list = managers + Ryan, larger notes, Finish count Morning→Night Start→End of Night, solid red
  (sheet, overview, tile), tile under Features (`afa0c49`…`6dc5928`). Checkpoint D passed (Ryan).
- **11-09 T11 review + `/ship`:** ZZ Test retired (SQL, Ryan's OK). Self-review fixed a crash when a save lands after a station
  switch (`00e51ab`) and made station tabs follow Setup live (`d8bd43b`). `/ship` (code, security, tests): no Critical/High;
  Ryan picked 4 fixes: screens reload on every live (re)join (a slept tablet catches up), a late answer for a station already
  left is dropped, new Setup items saved at the bottom (`da76e75`), fraction pars "1/2 gal" = 0.5 read as amounts, ranges
  flagged (`d8f8992`; all 55 live pars read as stored). 184 tests. Deferred: DB text/number caps + add-only history (need a
  migration), stale-row ordering, order-save rename race. Main's `prepsheets/` = the committed blobs byte-for-byte (worktree
  copies differ only in .xls timestamps). **Next:** Ryan says "push" → `prep-sheets:main`, live check, back up + move aside
  `prepsheets/`, merge back (xlsx → main's CDN 0.20.3), remove worktree. Nothing pushed yet.

---

### 2026-11-09 — Prep Overview Cards Colored by How Far Behind Each Station Is

**File(s) Changed:** on branch `prep-sheets`: `app/src/lib/prepSheets.js` + test, `app/src/pages/PrepOverview.jsx`,
`app/src/prepSheets.css`, `spec/prep-sheets.md`, `tasks/todo.md` **Type:** `feature` — `99b61dc`, **not pushed** (ships with
prep sheets). **Summary:** Ryan wanted each overview card wholly red/yellow/green, but the raw score can't be cut the same
way for every station (Lunch maxes at 126, Sautee at 38, and both move as items change).

- `stationScore` adds `need` = (2 × red + yellow) ÷ (2 × counted items), 0 = all green, 1 = all red, and `color`: Red ≥ 50 %,
  Yellow ≥ 25 %, Green below, null (grey) when nothing is counted. Not-counted items stay out of the maximum. Ryan picked
  this over "share of red items" (ignores yellow) and "any red = red" (4 of 5 stations red today).
- `rankStations` sorts by `need` (ties by name, nothing counted last), so size no longer decides the order.
- Card: tint + thick left edge like the sheet's lines; "N% behind" (rounded down, so it never reads past its color's cutoff)
  replaces "Score N", raw score in the hover title. Kitchen tile unchanged.
- **Gotcha:** index.css loads after `prepSheets.css`, so `.card:hover` (same specificity) greyed the colored edge — rules
  scoped under `.prep-overview`.
- Checked: T 188 (9 new/changed failed first) · B · browser (office unlocked by Ryan): Lunch 100 / Sautee 100 / Salad 50 red,
  Fry 27 yellow, Grill 0 green — matches SQL; hover keeps the edge; 375px no sideways scroll; 0 console errors.

---

### 2026-11-10 — Station Prep Sheets SHIPPED to Production; `have_before` Migration; Test Data Wiped

**File(s) Changed:** `supabase/migrations/20261110163331_prep_entries_have_before.sql`, `spec/prep-sheets.md`,
`tasks/todo.md` (branch `prep-sheets`, `4fb529b`); merge `7c2f0f0` on main **Type:** `feature` + `migration` + `data`
**Summary:** Prep sheets are live (`origin/main` `7ac0e01..4fb529b`, 28 commits, fast-forward; Vercel production READY).
Ryan chose to ship it now and add a "Completed" tab + 3-day prep log as a second push (spec Addition 11-10, approved).

- **Migration `20261110163331` (Ryan's OK):** `prep_entries.have_before` (nullable) + `prep_record` replaced with the same
  signature/grants, saving the count before each change, so Completed can tell "made 16" from a recount. Live function
  matched the repo copy line for line first. Check as anon inside a rolled-back transaction: count 0→1, done 1→1,
  partial 1→3, each with the right before-value; 0 rows kept. Applied BEFORE the push so day-one history is complete.
- **Test data wiped (Ryan's OK):** counts/notes/stamps blanked on 175 items, 23 Finish counts and 420 history rows
  (all Ryan's and my test saves) deleted, so the crew starts grey. After: 5 stations, 172 items, 0 / 0 / 0.
- **Live check:** kitchen sheet all "Not counted", "Last count: No count finished yet"; dashboard tile 0/0 on all five.
  Office overview not opened (gate). Only console error came from a Chrome ad-blocker extension.
- **Merged back into main (`7c2f0f0`):** only the lockfile conflicted → main's (vitest 5.1.0 + SheetJS CDN 0.20.3);
  `package.json` identical; App/Office/Kitchen/Dashboard auto-merged (15 lines). T 197 · B. Main's own backlog stays
  unpushed (79). `prepsheets/` backed up to `../DailyBrief-prepsheets-backup-2026-11-10` (hash-identical to the
  committed files). Worktree kept: the Completed tab is built there next and ships alone the same way.
- **Decided for the Completed tab:** prep day 5:00am–4:59am (kitchen closes 10pm, End of Night in by midnight); prepped
  = Done, Partial, or a typed count that rose from a counted value; one tab after the station tabs for all stations;
  3-day log = prep entries only, Finish counts as dividers.

---

### 2026-11-11 — "To prep" Box SHIPPED: Red + Yellow Items, Most Needed First; Completed Tab Parked

**File(s) Changed:** on branch `prep-sheets`: `app/src/lib/prepSheets.js` + test, `app/src/components/PrepToDo.jsx` (new),
`app/src/components/PrepPartialForm.jsx` (new), `app/src/components/PrepLine.jsx`, `app/src/pages/PrepSheets.jsx`,
`app/src/prepSheets.css`, `spec/prep-sheets.md`, `tasks/todo.md`; merges `3265fd5`, `1d6d405` on main
**Type:** `feature` **Summary:** Ryan: scrolling a 63-line sheet to find the red lines was a pain. He wanted to see
exactly what to prep and how much, most needed first, and to work through it without scrolling away and back. So each
station's sheet now opens with a "To prep: N" box. Live as `ccb0bb1` (`origin/main` `4fb529b..ccb0bb1`, 5 commits,
fast-forward; Vercel production READY).

- **The box:** only Red and Yellow items (Ryan, 11-11), ordered by have ÷ par, lowest first. Units differ, so the amount
  to prep can't rank them. Equal shares keep sheet order. Each row shows the name, "prep N unit", and Done / Partial right
  on it. Done drops the row, Partial re-sorts it. It saves through the page's `record()`, so the name check and errors
  are the same as the line's. The full sheet below is unchanged (End of Night still counts in sheet order).
- **Code:** `toPrepList` is pure, with 7 tests written first. The "Made N" form moved into `PrepPartialForm.jsx`, which
  the line and the box share. No database change.
- **Parked (Ryan, 11-11):** the Completed tab + 3-day log (spec Addition 11-10). Only its `have_before` column had
  shipped.
- **Seen, left as is (Ryan):** after Done, the next row slides up under the finger, so a quick double-tap could mark it
  Done too.
- **Checked:**
  - T 195 · B.
  - Browser on `ZZ Test`, re-activated with Ryan's OK and retired again: order, Done, Partial, the no-name refusal, a live
    re-sort from a second tab, one `prep_entries` row per save, 375px.
  - `/review-change` approve; `/ship` GO (code, security 0 findings, tests). Not browser-tested, accepted by Ryan: a
    Partial box open while its row re-sorts or leaves; a refused or failed Partial in the box.
  - Live (read-only): all five stations show the box with real counts. Grill's order matches SQL.
  - Main after merge: T 204 · B.

---

### 2026-11-12 → 11-15 — Order Guide Step B: Generate Builds the BEO Order List From Confirmed Dish Specs (Tasks 0–4; NOT pushed)

**File(s) Changed:** `spec/beo-order-from-specs.md` (new), `tasks/plan.md`, `tasks/todo.md` (prep-sheets plan archived to
`tasks/archive/`), `app/src/lib/beoLines.js` + test + `beoLines.dishNames.fixture.js`, `app/src/lib/beoOrderList.js` + test,
`app/src/lib/beoOrderData.js`, `app/src/pages/EventsBanquetsPage.jsx`, `supabase/migrations/20261115162620_beo_dish_matches.sql`
(all new except the page). Commits `72a132d`, `84eb733`, `147f4d8`, `4540f04`, `bab888a`, `b5d50b6`, `008d5c6`.
**Type:** `feature` + `migration` **Summary:** Before, "Generate from BEO" sent the whole BEO to Gemini, which invented
its own dishes and ingredient names each run. Now every BEO line that is a confirmed menu dish is built from that dish's
confirmed spec and products. Only the lines no spec covers go to the AI, and its groups are tagged "AI guess".

- **Spec approved by Ryan 11-12:**
  - A line equal to exactly ONE orderable dish name auto-matches.
  - The beverage keywords are copied into the app as WHOLE words (the function's substring check drops "Steak Dinner").
  - B ships with main's backlog.
  - Grey BEO lines go under each spec-built dish.
  - A dish name typed under another dish is asked "Part of / Its own dish". Plan: Tasks 0–8, 3 checkpoints.
- **Task 1, `classifyBeoLines`:** an item's first-line dish makes its other lines description (rule 2a); otherwise
  each line on its own: saved answer → plain note → exact unique name → to match (2b). 65 tests on real BEO lines.
- **Task 2, `suggestDishes` / `searchDishes`:** word overlap with accent folding and singulars. All four real near
  misses rank FIRST against the 364 real names (fixture).
- **Task 3, `buildOrderList`:** one group per dish, in spec order, with grey `beo_text`. A dish whose spec isn't
  confirmed or has no lines goes to the AI. 14 tests (live Pasta Bar spec, 15 lines).
- **Task 0, migration (applied 16:26 UTC with Ryan's OK):**
  - `beo_dish_matches`: 5 kinds, pair answers keyed by `under_dish_id`, `nulls not distinct`, cascade on
    `menu_dishes`, plus 2 checks beyond the spec (now in it).
  - `event_order_items.ai_guess` (DEFAULT TRUE, so rows from the live old code count as AI) and `beo_text`.
  - Checked: SELECT, plus a rolled-back anon test (7 good rows, 10 bad refused, 0 kept).
  - Minutes later all 29 order rows were gone. The logs show 4 old BEOs deleted from the office page, and order rows
    cascade with their BEO. Ryan confirmed it was his cleanup.
- **Task 4, Generate:**
  - Steps: dishes (count-checked) → saved matches → classify → spec lines (count-checked) → products →
    `generatedRows` (AI groups numbered after the spec groups) → `replaceGeneratedRows` (delete and insert errors are
    now checked; the old code checked neither).
  - No AI call when nothing is left for it. 288 tests; 5 mutations, each caught.
  - Browser, live DB: American Outdoor Brands built 4 dishes from specs (30 lines, 28 with a product); Club Car Wash
    built Garlic Mashed Potatoes from mid-item.
  - Regenerate: spec rows md5-identical and the hand-added row kept. The AI groups changed between the same two runs
    (Oreo Cheesecake 5 lines → 2), which is the reason for B.
  - 375px and 0 console errors.
- **Checkpoint B:** Ryan checked Club Car Wash: "everything looks good".
- **Left on live:** the generated order lists on American Outdoor Brands and Club Car Wash.
- **Moved to Task 5:** the live "no AI call" check. No current BEO is fully matched until its lines can be answered.
- **Next:** T5 the matching box, T6 Part of / Its own dish, T7 Change match, Checkpoint C, T8 review.

---

### 2026-11-16 — Open Threads List Added; Order Guide B Task 5 (the Lines-to-Match Box) Built

**File(s) Changed:** `CHANGES.md` (Open Threads at the top), `app/src/components/BeoLineMatcher.jsx` (new),
`app/src/lib/beoLines.js` + test, `app/src/lib/beoOrderData.js`, `app/src/pages/EventsBanquetsPage.jsx`, `tasks/todo.md`;
4 October entries + step A's entry moved to `docs/changelog/2026-10.md`. Commits `bc96b82`, `5020df5`, `c2acd29`.
**Type:** `docs` + `feature` — NOT pushed.

- **No HANDOFF.md (Ryan asked):** `tasks/todo.md`, this file and the Serena session note already cover the next step,
  history and restart. The missing piece was one list of everything open across features, so **Open Threads** now
  heads this file, rewritten at every `/sc:save`. Building it found the Prep Sheets memory still saying "waiting on
  push" a week after it shipped (fixed), and a Vite server left running after `TaskStop` (stopped; memory notes it).
- **Task 5, built:** Generate now opens a box on that BEO's order list when lines are not yet known, BEFORE building:
  - each line with its BEO item, 3 suggested dishes (menu · section · season), Pick another dish (search), Not food,
    Not on a menu, and Describes the line above (only where a line sits above);
  - each answer saves at once (`saveMatch`: upsert on `source_text,under_dish_id`; a rolled-back anon SQL test showed
    the null-`under_dish_id` row is UPDATED, not duplicated); a failed save shows "Not saved: …" and the line stays
    unanswered;
  - Build list builds with what is answered; unanswered lines go to the AI this time and are asked again next time.
- **Fix found on the way:** the Seasonal menu repeats a dish name in all four seasons (Classic Caesar Salad ×4), so
  suggestion and search order came from the database. Dish order now breaks ties by season; labels show the season.
- **Checks:** 296 tests (new `linesToMatch`, `matchRow`, season order; test first), 6 mutations each caught, build.
  Browser with every `beo_dish_matches` write blocked in the page: Walton Heath → 8 lines, no AI call; forced failed
  save; search; Cancel; 375px; 0 console errors; 0 saved answers after.
- **Open:** criteria 1, 2 and 4 need Ryan's real answers (they are saved for good). See Open Threads.

---

### 2026-11-16 → 11-17 — Task 5 Passed on Ryan's Real Answers; BEO Parser Found Losing Street Dinner Desserts

**File(s) Changed:** `tasks/todo.md` (Task 5 results), `CHANGES.md` (Open Threads; the 11-02 → 11-04 entry moved to
`docs/changelog/2026-11.md`, new). No app code. **Type:** `docs` (verification + investigation) — NOT pushed.

- **Task 5 checks, on the dev server against the live DB.** Ryan answered the lines himself. I checked the result in
  SQL, the function logs and the shipped code (read-only):
  - **Club Car Wash** (in place of the deleted Celebration of Life): 15 answers saved. 7 groups built from specs, with
    the near miss "Chopped Ceasar Salad" built as Caesar Salad. 1 AI group: Becca's rolls, answered Not on a menu, and
    no rolls dish exists. One AI call. The shipped `classifyBeoLines` finds 0 lines left to ask.
  - **Screaming Eagle Dinner Club** (in place of the deleted Walton Heath): 2 AI groups. Their ingredients (radicchio,
    endive, pecorino; mushrooms, wild rice, broccolini) appear only on the second lines, so each description reached
    the AI with its dish. The allergy lines were answered Not food and kept out.
  - **No AI call:** Rusty Drewing (both lines Not food). The logs show no call, 0 rows and a "No food items found"
    alert, which is true. A read-only run over all 34 BEOs found none that is all on a menu: the Thanksgiving
    take-out menu isn't loaded. Ryan counted Rusty Drewing as passing.
- **Street Dinners** (Ryan): a new menu every month, so they will never match a menu and are always AI-built.
  Build list without answering sends each whole item to the AI, the same as Not on a menu + Describes.
- **Dessert lost from the order list: `process-beo`'s parser, not order guide B.**
  - On today's packet, "Pumpkin Pot de Creme" sits on its own row (gap 23) and "Allergies!!" comes next with a label.
    `isCategoryHeader` therefore makes the dessert a CATEGORY. The gate passes it, because category names vouch by
    containment.
  - A survey of 10 packets (Sept–Nov) found the same in October ("Apple Cider Cheesecake with Salted Carmel"),
    "Cookies Platter" and "3 bottles Meiomi" (9/23), "Corkage Fees" and some golf-shop lines.
  - **Font DOES separate them.** Real headings use the `Qty` cell's font (`fontName`, per document). Dish lines use
    another. The 08-30 note said otherwise, probably from `fontFamily`, which reads "sans-serif" for every font.
  - Fix proposed, not built: Ryan to say go. The diagnostic scripts were throwaway (the Serena note has the method).
    8 packets were downloaded to the gitignored `BEOs/` via `supabase storage cp` (it needs a RELATIVE destination
    path on Windows).

---

### 2026-11-17 — BEO Parser: A Category Heading Must Be in the Heading Font (Street Dinner Desserts Kept)

**File(s) Changed:** `supabase/functions/process-beo/beoGeometricParser.ts`,
`supabase/functions/process-beo/beoGeometricParser_test.ts` (new). **Type:** `fix` — built and tested, NOT deployed
(`process-beo` is still v26).
**Summary:** A plated meal's LAST course, printed on its own row with a labelled row below ("Allergies!!"), was read
as a category heading, so it never reached the order list. `isCategoryHeader` now also requires the line to be printed
in the section header's `Qty` cell font.

- **Survey first (10 packets, Sept–Nov, the shipped parser instrumented in a scratch copy):** 414 rows read as
  headings; 407 in the heading font (`fontName` `g_dN_f3`; body is `f4`, notes `f5`), and the other 7 all wrong:
  Pumpkin Pot de Creme x3 (same Screaming Eagle event in 3 packets), Apple Cider Cheesecake (Oct Screaming Eagle),
  Italian Cannolis + a "Please have GF noodles…" note (Mid Mo Mahjong), "3 bottles meiomi pinot noir" (9/23).
  The 11-16 "Cookies Platter" / "Corkage Fees" hits were my loose containment match, not misreads.
- **Code:** `Cell.font` from pdf.js `fontName`; `headFont` set from the section header's Qty cell and carried across
  pages with `qtyX` (continuation pages print headers without a section header); only a header's FIRST line is
  checked (its wrapped remainder, "Minimum order of 10 per item", is body font). `assemble` exported for the test.
- **Tests (test first):** 4 Deno tests on rows copied from the real pages (contact rows left out): the dessert stays
  in its Plated Food item, "Street Dinner" is still a category, a continuation page keeps "Bar Services" and drops
  "Italian Cannolis" as a heading, a two-line header still joins. RED 3 of 4 before the fix for the bug's own reason.
  Mutation: not carrying the font across pages → 1 fails. `every` → `some` survives: no real row mixes fonts.
- **Old vs new on all 10 packets:** exactly those 7 events change, 282 identical; every packet still passes the gate
  with the same item counts. The dessert joins the plated item (as the entrée already did), the cannolis + GF note join
  Themed Buffets, the Meiomi joins the Beverages wine line.
- **Live:** only Screaming Eagle 11/17 is affected (dessert as a category, 12 order rows). Deploy + re-import need
  Ryan's OK. `deno check index.ts` shows 11 type errors, all in `index.ts`, the same before this change.
