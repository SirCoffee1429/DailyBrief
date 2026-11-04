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

---

## Detailed Entries

### 2026-10-10 — Time Off Calendar: Days Line Up Under Their Weekday Again

**File(s) Changed:** `app/src/index.css` **Type:** `fix` — shipped ALONE as `21cee39` (pushed
`fix/time-off-columns:main` from `origin/main`), merged back into local main as `1061a58`.

**Details:**

- **Report:** October requests looked "pushed forward a day" (the 6th showing as the 7th).
- **Not a date bug.** The DB held the right dates and the page put each in the right cell (checked in Chrome
  on America/Chicago). The cells had slid out from under the headers: the weekday row and the day grid are
  two SEPARATE grids, both `repeat(7, 1fr)`, and a bare `1fr` cannot shrink below its content's min width,
  so long names (Bella Hammond, Katelyn Zeidler) widened their day column. On the live page the 28th sat
  under MON-TUE and Tue the 6th under WED.
- **Fix:** both grids `repeat(7, minmax(0, 1fr))`; long names truncate with the pill's existing ellipsis.
- **Verified:** the same CSS injected on the live page gave 7/7 header lefts = cell lefts and 0 horizontal
  overflow; `npm run build` passes on the shipped tree; the live CSS bundle serves the new rule. Mobile
  width not checked separately.

---

### 2026-10-13 — Office Tasks Tab: Add Kitchen Tasks Without a Briefing (shipped on its own)

**File(s) Changed:** `app/src/pages/History.jsx`, `app/src/pages/Dashboard.jsx`,
`supabase/migrations/20261013000000_standalone_briefing_tasks.sql` **Type:** `feature` + `migration` — shipped
ALONE as `7ac0e01` (pushed `feat/standalone-tasks:main` from `origin/main`), merged back into local main as `b378678`.
**Summary:** A task no longer needs a briefing. The office **Tasks** tab (`/office/history`) gets an "Add a kitchen
task" box; the task shows on the kitchen dashboard on its date. Kitchen (BOH) only — FOH unchanged (owner).

**Details:**

- **Schema (prod, via MCP):** `briefing_tasks.briefing_id` nullable; new `date` + `created_at`; check
  `briefing_tasks_briefing_or_date` (a task has a briefing OR a date); partial index on `date` where no briefing.
  Additive — the old deployed app kept working. A standalone task = `briefing_id IS NULL`.
- **Tasks tab:** text + date (defaults via `defaultBriefingDate()`: today before 5pm, tomorrow after). Each day card
  lists them under "Kitchen Tasks" with a ✕ delete (confirm prompt). Briefing tasks still edit through their briefing.
  Standalone tasks use the same window as the 30 loaded briefings.
- **Kitchen dashboard:** today's briefing tasks, then today's standalone tasks (oldest first); same checkbox. The
  task load now runs even with no briefing, with a cancel guard so the pre-briefing run can't overwrite the full list.
- **Not touched:** `FOHDashboard.jsx` (still briefing-only), `BriefingEditor.jsx`, Office dashboard task count (now
  includes standalone tasks — it counts all rows).
- **Verified (local dev on prod DB):** add (today + tomorrow) → right day card; kitchen dashboard showed it beside a
  task-less briefing (0/1), checkbox saved `is_completed`; delete removed row + empty group. Test rows deleted (0
  standalone rows left). `npm run build` passes; Vercel prod deploy READY and the live bundle serves the new form.
  Mobile width not checked separately.

---

### 2026-10-14 — Seasonal Recipe Books Drive the Dish Drafter; Fall Drafted From the Book

**Session name:** `house-recipe-books` — Serena memory `session-2026-10-14-house-recipe-books`.

**File(s) Changed:** `supabase/migrations/20261014000000_house_recipes.sql` (new), `app/scripts/recipe-book-sql.mjs`
(new), `supabase/functions/draft-dish-specs/index.ts`, `supabase/functions/draft-dish-specs/house_recipe_test.ts` (new),
`app/src/pages/DishSpecs.jsx`, `app/src/index.css`, data (`house_recipes`, fall `dish_ingredients`) **Type:** `feature` +
`migration` + `test` — `draft-dish-specs` v13 → **v21** (deployed), page change NOT pushed. Committed 10-16 as
`f93b9d4`; the book PDF is gitignored (stays on disk as the loader's source).
**Summary:** The owner's seasonal recipe books (`seasonal-recipes/fall_recipe_book/Fall Banquet Recipe Book.pdf`, 25-portion
yields, "On the Plate", sub-recipes) are now the drafter's source for the dishes they cover, and the Dish Ingredients page
shows the book recipe beside each spec. Owner: the books' ingredients and portions are right, the methods are not
checked — so only title → ingredients is stored.

**Details:**

- **`house_recipes`** (prod, via MCP): season, title, `recipe_text` (title through ingredients, method cut). Open policy
  like `menu_dishes`. `dish_house_recipes(uuid[])` = the dish's recipe (same season, name compared without case/accents)
  + every recipe it names under ON THE PLATE / INGREDIENTS, followed down. Searching the description too pulled the pork
  entrée into the buffet bread pudding ("Side for the Herb-Crusted Pork Tenderloin") — fixed before load.
- **Loader** `app/scripts/recipe-book-sql.mjs <pdf> <season>` prints the insert. Fall: 30 recipes; the 9 Contents entries
  not loaded are all section headings. Cross-checked line-for-line against an independent pypdf extraction (30/30) and
  by md5 after load.
- **Drafter (rule 13):** for a house-recipe dish the model copies each recipe's WHOLE batch (unit conversion only); code
  does every division. Shares are read off the BOOK: the dish's own recipe = 1 of its portions; a plate side = its plate
  amount ÷ (portions × portion size); a sub-recipe = the amount on its parent's line ÷ its YIELD × the parent's share.
  The model's numbers are only a fallback, named in the note. Each step was forced by a measured failure: model-summed
  amounts (crouton bread −34%, a butter dropped), a model-computed share (pecans 2.7% vs 1.7%), model-copied numbers
  (Short Rib sides 0.2% vs 4%, horseradish 0.5% vs 3.7%).
- Also in code: a sub-recipe's own line is dropped (it was ordered twice); lb → oz so recipes sum; a title with its
  subtitle is that recipe (the Short Rib had lost its beef); a recipe's own section sent back separately (salmon glaze,
  pork loin jus) is counted with its recipe; an amount that rounds to 0 is named, not saved (a 0 failed a whole batch).
- **Buffet entrées × 0.65** of the book's single-entrée portion (owner); buffet sides stay as written.
- **Tests:** `house_recipe_test.ts` 12 cases sliced from the real code, real book text for the share cases; with
  match/retry 21/21. Mutation-checked: 13 single changes each fail a test, file restored byte-identical.
- **Data:** all 18 fall dishes the book covers drafted (all 37 shares from the book, each hand-checked). NOT covered by the
  book, left unspecced: both Caesars, House Garden Salad, 3 plated + 4 buffet desserts. Spring/summer/winter wait for
  their books (owner).
- **Known model slips still in the fall drafts (named in notes, for review):** chicken's heirloom carrots merged into
  `carrot`; one garlic amount dropped on Short Rib, Pork Loin and Chicken (heads vs oz); greens specced as lacinato kale.
- **Page:** collapsible "fall recipe book: … + N recipes it uses" under each spec and in the edit form. `npm run build`
  passes; browser check pending (office gate).

---

### 2026-10-15 → 10-16 — Ingredient Products: Search, and Split Dishes Off to Another Name; Eggs Fixed

**File(s) Changed:** `app/src/pages/IngredientProducts.jsx`, `app/src/index.css`, `.gitignore`; data (`dish_ingredients`,
`ingredient_products`) **Type:** `feature` + `fix` — committed `626f9ee`, NOT pushed (local `main` is 58 ahead of GitHub).
**Summary:** Owner request: a confirmed ingredient match could not be searched for or corrected. The case: confirmed
"egg" → EGG PATTY was right for the 4 breakfast sandwiches but wrong for 65+ other dishes. Re-picking the product can't
fix that — one ingredient NAME maps to ONE product for every dish (owner: "that would put me in the same situation") —
so the fix moves some dishes to another name.

**Details:**

- **Search** (ingredient, product, or dish name; every status, so the status filter is disabled while searching). Ranked:
  exact name, then names holding every word, then dish-only matches — "eggs" was buried under mayonnaise (Deviled Eggs).
- **Split** on every row, confirmed ones too (key `s`): tick dishes, type a name, a live line says where they land
  ("12 dishes will join "egg" (confirmed: …)"). At save: the target is looked up again; a ticked dish already listing it
  is refused BY NAME (unique `(dish_id, ingredient_name)`), nothing written; the moved count must equal the ticked count.
- **No match outlives its last dish:** when a fresh count finds no dish left on the old name, its match is renamed onto a
  brand-new name, or deleted when joining an existing one — else the drafter could write the name again and its dish
  would inherit the product unreviewed. The count is taken after the move, not from the form's list (a dish drafted while
  the form sat open still needs the match) — fixed in a `/sc:analyze` pass, along with two missing comments.
- **Data fixed through the page:** `egg patty` 4 sandwiches → #955042 EGG PATTY; `egg` 77 dishes (65 + the 12 from
  `eggs`) → #518048 EGG WHITE LARGE GRADE A LOOSE (= white shell eggs, owner); `eggs` gone. Orphan confirmed matches
  `peanuts` (PEANUT SALTED SHELF-STABLE) and `raisins` (trail-mix dried fruit) deleted (owner); 0 orphans remain.
- **Verified:** `npm run build`; in the browser on prod data — the egg split, the clash refusal (Sausage Bagel, nothing
  written), and a whole-name round trip `baked beans` → `baked beans split test` → back (match carried both ways, only
  `updated_at` changed, no leftover row). Each step checked by SQL. Not checked: phone width; a dish drafted onto the
  old name while the form is open (code-read only).
- Also: the 10-14 recipe-book work committed separately (`f93b9d4`), its PDF gitignored. Left uncommitted on purpose:
  `supabase/.temp/cli-latest`, the Vendor Data worksheet, `.serena/memories/session-2026-09-27-schedule-week-redate.md`.

---

### 2026-10-17 — Owner Finished the Spec and Ingredient Review; Spring–Winter to Be Redrafted From Their Books

**File(s) Changed:** data only (owner, through the Dish Ingredients and Ingredient Products pages); `CLAUDE.md`
**Type:** `docs` — status check by SQL, no code change.
**Summary:** The owner reviewed and confirmed the 18 fall book drafts and finished mapping every ingredient. Checked on
prod: **345/364 orderable dishes confirmed, 19 drafts, 0 unspecced**; all 373 ingredient names confirmed (325 to a product,
48 not from the catalog); 0 matches with no dish.

- **Later 10-17: the 19 drafts (all From the Bakery plated desserts) confirmed too → ALL 364 confirmed**, every dish has
  lines, 0 orphan matches. P3's data is complete; next is P4 (order quantities on a BEO).
- **Spring/summer/winter (83 dishes) were specced and confirmed WITHOUT recipe books** (only fall's is loaded). Owner
  decision: **when each season's book arrives, load it and redraft that season's dishes from it.** CLAUDE.md updated.
- Fall garlic spot-check against the book: Short Rib, Airline Chicken, Chicken Marsala and Pork Loin's head of garlic all
  divide correctly (incl. buffet ×0.65); Pork Loin's second line (1 Tbsp minced, ~0.4 oz per event) is still missing — left as is.
- Open: `.gitignore` covers only the fall PDF; the other seasons' books will show as untracked unless widened to
  `seasonal-recipes/*/*.pdf` (asked, not answered).

---

### 2026-10-17 → 10-19 — P3 Completion Check: the Costing Arithmetic Hand-Checked; Wrong Cheese, Apple, Lamb and Hot Dog Matches Fixed

**File(s) Changed:** data only (owner through Ingredient Products; four name fixes by SQL on the owner's instruction)
**Type:** `fix` — `/sc:reflect P3 --type completion --validate`, no code change.
**Summary:** P3's exit gate in the design doc ("three dishes hand-checked against the arithmetic") had never been
recorded. Ran the SHIPPED `specCost` against hand math: Bearnaise $0.9559/guest, House Cookies $4.1133/dozen, Cubed Cheese
& Crackers $17.6807/tray — identical to 4 places. Checking those lines found real mapping errors, all now fixed.

- **Cheese:** `cheddar cheese` (12 dishes: mac & cheese, soups, sandwiches) and `pepper jack cheese` were on a CUBED variety
  pack, `swiss cheese` on a cubed pack with no swiss. Owner split the trays onto `cubed cheddar/pepper jack/swiss cheese`, then
  re-picked `cheddar cheese` → shredded #158814 and merged `cheddar cheese slices` into `cheddar cheese slice`.
  Then `pepper jack cheese` (bagel) → sliced #469349 and a new `shredded pepper jack` (Tinga Tacos) → #270917; the cubed
  variety pack #1006778 is no longer matched to anything.
- **Apples (owner):** `gala apple` was on FUJI; both apple names now → GALA #950172 (the only apple the kitchen uses).
- **By SQL (owner's call, one guarded transaction):** `hot dogs` → `hot dog` on #970396 4/1 beef franks (the only 4/1 in the
  catalog — description doesn't say Nathan's); `rack of lamb` → not bought from this catalog (it was a boneless LEG);
  `monteray jack`, `monteray jack cheese`, `monetary jack blend` → `monterey …` (the last merged into `monterey jack blend`).
- **State 10-19:** 364/364 confirmed, 373 names all confirmed (49 not from catalog), 0 unmatched, 0 orphan matches.
- `.gitignore` widened from the fall PDF to `seasonal-recipes/*/*.pdf` (owner), so the other seasons' books stay out too.
- **What P4 faces:** of 2,693 lines only 2,022 cost exactly; 446 cross-class gaps, 45 on the pack-count guess, 36 with no
  pack total — **78 of 364 dishes cost fully today.** The per-mapping conversion is most of P4.
- A word check (ingredient word missing from the product description) surfaced ~55 names; most are kitchen choices
  (grapeseed for vegetable oil, paste bases for stock, rigatoni for ziti). Read the list, don't treat it as errors.
- The Supabase MCP returned "Invalid or expired requestState" on a write TWICE; neither ran (checked by SQL each time).
  The same statement without a trailing SELECT went through.

---

### 2026-10-19 → 10-25 — P4 Slice 1 (Case Yield): Requirements, Owner Data Fixes, Design — then PARKED

**File(s) Changed:** `claudedocs/requirements_p4_unit_conversion_2026-10-19.md` (new), `claudedocs/design_p4_case_yield_2026-10-25.md`
(new), data (owner through Dish Ingredients / Ingredient Products) **Type:** `docs` — `/sc:brainstorm` + `/sc:design`, no code.

- **Requirements (10-19):** a per-ingredient **case yield** (what ONE case gives in the dishes' unit), usable (trim baked in);
  `unitFit`'s pack-count guess **removed**; a re-pick **clears** the yield; mixed-unit names respecced to one unit kind.
- **Owner fixes the gap list surfaced (10-20, 10-24):** `celery` was on CELERY ROOT → CELERY SIZE 30 #865031; `cayenne pepper`
  was on a hot sauce → PEPPER CAYENNE GROUND #877906; `pickles` on a `1/5 GA` pail is right. `breadsticks` respecced to
  `each`, `corn syrup` to `floz` on every line; all three Bourbon Pecan Pie specs rewritten from a standard 9-inch pie
  (the WHOLE pie had been specced smaller than one slice).
- **Design (10-25), re-measured:** 2,698 lines; **517 lines / 101 names / 270 dishes need a yield**; 37 mixed-unit names;
  **88 dishes cost fully today** (78 on 10-19), 76 once the pack-count path goes. Q-1 answered **no drafts — the owner types
  every yield**: the FR-5 rules would have drafted 30, 9 of them wrong (mustard/ketchup `N/M OZ` are net weight, crostini
  `20/13 OZ` is 20 baguettes). Requirements D7/NFR-3 amended to match.
- **PARKED 10-25 by the owner** — see the next entry. The design doc is ready for `/sc:implement` when it resumes.

---

### 2026-10-25 → 10-26 — "Generate from BEO" Shows the Catalog Product Behind Each Item

**File(s) Changed:** `supabase/migrations/20261025000000_event_order_items_product.sql` (new, applied to prod),
`app/src/lib/orderProducts.js` (new), `app/src/components/ProductPicker.jsx` (new — moved out of `IngredientProducts.jsx`),
`app/src/pages/EventsBanquetsPage.jsx`, `app/src/pages/IngredientProducts.jsx` **Type:** `feat`
**Summary:** Owner: the reason for the whole mapping effort was for the BEO order list to show **the actual product** —
number, pack, price — not pricing or yields. Re-sequenced: **A** (now) looks up products for the existing AI order list;
**B** (next) builds the list from BEO lines → confirmed dishes → confirmed specs. Yields wait.

- **`event_order_items.product_id`** → `supplier_products`, `ON DELETE SET NULL` (the catalog is rebuilt from PFG exports).
  Additive; the live site ignores it.
- **Lookup (`productsForItemNames`)** reads only CONFIRMED `ingredient_products` rows with a product: exact name, then plain
  singular/plural, then — only if the whole name misses — leading prep words dropped from a fixed list (shredded, unsalted,
  granulated, semi-sweet, chopped, diced, sliced, minced, grated; "fresh"/"whole" deliberately out). Nothing fuzzier:
  `onions` stays a miss because the kitchen buys yellow, red and green. Looked up BEFORE the old list is cleared.
- **Order list:** each item shows `#number · description · brand · pack · $/case (varies) · last bought`, or "No catalog
  product", with **change / pick product** opening the shared catalog picker. **A pick belongs to that BEO's row only** —
  it never changes the ingredient's match for every dish.
- **Verified:** Homecoming Dinner regenerated by the owner → 22/28 with a product (the AI wrote "unsalted butter" this run,
  "butter" the last); the prep-word rule then took it to **26/28**, run through the SHIPPED module in the browser.
  Misses by design: white wine (not from catalog), fresh herbs, onions. Picker opened, searched, cancelled (no write).
  `npm run build` passes. **Not checked: phone width** (the window would not resize).
- **Known wrong under the prep-word rule:** `diced tomatoes` → fresh vine-ripe (likely meant canned) and `shredded
  mozzarella` → the fresh pearls (`mozzarella` is the pearls' name). Owner told; "diced" can be dropped from the list.

---

### 2026-10-31 → 11-01 — Old Skill Bundle Removed; Five Vendored Skills and Live-Safety Permissions Added

**File(s) Changed:** 256 deletions (`2968f78`); `.claude/skills/` (new, 5 skills), `.claude/rules/skills-and-live-safety.md`
(new), `.claude/settings.json` (new), `.gitignore` (`dcfd7e6`); `.claude/settings.local.json` (replaced, not in git)
**Type:** `config` — no app code, nothing pushed.
**Summary:** Owner's cleanup plus a new skills setup, prepared and reviewed 10-29 in a Cowork session (`_skills-setup/APPLY.md`)
and applied here, every file checked against the manifest's SHA-256 before and after copying.

- **`2968f78` (owner's cleanup):** the everything-claude-code commands and skills in `.claude/`, `SuperClaude Guides/`, root
  `package.json` (it held only the `fallow` dev tool), `.fallow/`, `app/sample-data/*` and other scratch files. Both
  `settings.local.json` files and `supabase/.temp/*` were untracked but stay on disk. Vercel builds from `app/`, so the live site is unaffected.
- **Vendored skills (`dcfd7e6`):** `supabase`, `debugging-and-error-recovery`, `code-review-and-quality`,
  `deprecation-and-migration`, `security-and-hardening`, copied by hand from pinned commits with local edits. Sources are in
  `.claude/skills/VENDORED_SKILLS.md`. Never install skills with `npx skills add` or a marketplace.
- **`.claude/rules/skills-and-live-safety.md`:** ask Ryan before live-data SQL or migrations, edge function deploys and
  secrets, `git push` and history rewrites, and any install.
- **`.claude/settings.json`:** 13 "ask" rules (Supabase `execute_sql`, `apply_migration`, `deploy_edge_function`, the branch
  and project calls, `git push`) and bypass-permissions mode disabled. "Ask" overrides "always allow", so these prompt
  even when a local file allows them. Read-only `SELECT`s through the connector prompt too.
- **`settings.local.json`:** 15 risky "always allow" entries removed (live SQL, migrations, deploys, secrets, installs,
  `git checkout *`, `git filter-repo`). It's now ignored by the repo's `.gitignore` as well as the global ignore, so
  it never shows in `git status`.
- `_skills-setup/` deleted after the copy (step 6). The repo converts line endings to CRLF on checkout, so a later SHA-256
  check against the old manifest would fail even with the content unchanged.

---

### 2026-11-02 → 11-04 — agent-skills Workflow + Vitest; npm Audit to 0 (SheetJS From Its CDN)

**File(s) Changed:** `.claude/` (agents, commands, references, skills, rules, settings), `CLAUDE.md`, `app/package.json`,
`app/package-lock.json`, `app/src/lib/dates.test.js` (new) **Type:** `config` + `test` + `chore` (deps) — 3 commits, **none pushed**.
**Summary:** Adopted `addyosmani/agent-skills` as DailyBrief's workflow, added a test runner, and cleared every `npm audit`
warning. Pushing `main` would put the new vite, react-router and xlsx in the live bundle — the owner's call.

- **`3528bdd` — agent-skills pack** vendored by hand at `301b02b`: 25 skills, 4 agents, 9 commands, shared references, each with
  a DailyBrief local-rules block (`VENDORED_SKILLS.md`). `/plan` → `/plan-tasks`, `/review` → `/review-change` (built-in clashes);
  `/build` does one task (no `/build auto`); agents only via `/ship` or on request. Superpowers OFF for this project only
  (`.claude/settings.json` `enabledPlugins`) — owner confirmed 11-03 it no longer loads. `/constraints` (writes `CONSTRAINTS.md`)
  is installed but not run: owner skipped it; no agent reads that file.
- **Vitest:** `npm test` in `app/`; first suite pins `lib/dates.js` (9/9).
- **`3107002` — `npm audit fix`:** 10 advisories fixed within existing semver ranges (vite 6.4.5, react-router 7.18.5, postcss,
  @babel/core, nanoid, ws, …); only the lockfile changed. **On this machine node_modules stayed old until a separate
  `npm install`** — the first test/build had checked old code; re-run after.
- **`41c59ce` — xlsx:** npm's `xlsx` stops at 0.18.5 (CVE-2023-30533 prototype pollution, CVE-2024-22363 ReDoS); SheetJS ships
  fixes only on its CDN, so `app/package.json` pins `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. `npm audit`: **0**.
  Upgrade by the next CDN tarball URL, never `npm i xlsx`.
- **Checked:** old vs new SheetJS on all 28 repo `.xlsx` files with the app's read options — the only change is CRLF → LF inside
  multi-line cells (recipe assembly text); nothing splits on `\r`. The app's own parsers (`lib/catalogParse.js`) gave identical
  numbers on both. In the browser (`/office/catalog`, preview only, **nothing saved** — the local app writes to the LIVE DB):
  S2S Walkin 169 rows / 169 products / 0 varies / 0 unpriced; master list 1,381 products / 20 categories / 347 item groups; no
  console errors. `npm test` 9/9, `npm run build` passes.
- **Gotcha:** stopping a backgrounded `npm run dev` can leave Vite's node process holding 5173 and serving old deps — kill it by
  PID, restart with `--force`.
- **Seen, not investigated:** at ~9pm 11-03 the FOH brief header showed Wed Nov 4 while Kitchen showed Tue Nov 3 — possibly the
  `defaultBriefingDate()` after-5pm rule applied to one view and not the other.

---

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
