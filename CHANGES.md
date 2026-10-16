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

---

## Detailed Entries

### 2026-10-06 — Office Time Off: Remove a Request From the Calendar (shipped on its own)

**File(s) Changed:** `app/src/pages/TimeOff.jsx` **Type:** `feature` — **pushed and live** (`461f12a`,
Vercel production READY), shipped WITHOUT the 45 unpushed commits on `main`.
**Summary:** Owner request: on `/office/time-off`, clicking a name on the calendar opened the
new-request form and there was no way to remove it there. A trash button already existed, but only
in the Upcoming list (requests not yet ended).

**Details:**

- Office mode only: clicking a calendar name asks "Remove <name>'s time off (<dates>)?" and deletes
  it (`stopPropagation`, so the day's click no longer fires); the empty part of a day still opens
  the form. The kitchen calendar is unchanged. The Upcoming trash button shares the named confirm.
- `deleteRequest` now uses `.select()` and checks a row was removed, as the approve/deny path does:
  a blocked delete returns no error, and it was going on to notify the office of a cancellation
  that never happened. (The DB delete policy exists; nothing was failing — this closes the gap.)
- **Shipping on its own:** branch from `origin/main` → commit → `git push origin time-off-remove:main`
  (fast-forward of one commit) → `main` merged `origin/main` back (`caace3b`, merge — not a rebase,
  which would have rewritten the 45 commits' hashes that the docs cite). Merged `main` builds.
- **Verified:** `npm run build`; owner tested on a local dev server (confirm names the request,
  Cancel leaves it, OK removes it, empty day still opens the form) — "yep it works".
- **Validated after deploy:** the live bundle contains the change and NONE of main's unpushed work
  (no Purchase History / Ingredient Products / `describesProduct`). Owner's real removals right after
  (6 cancellation notifications, 07:13–07:14 UTC; sent only on a confirmed delete) prove it in use.
- **Past requests ARE removable** — the calendar shows every non-denied request in any month paged
  to (an earlier note said otherwise; corrected). Only an ENDED DENIED request is unreachable.
  Open, low: nothing signals on touch screens that names are tappable (hint is hover-only).

---

### 2026-10-07 — Dish Spec Review: Wings, Burrata, Whole Fruit, Sourdough Slices, Stale Notes

**File(s) Changed:** data only (`dish_ingredients`, `ingredient_products`, `menu_dishes.spec_note`);
`CLAUDE.md`, `claudedocs/design_beo_order_guide_2026-09-15.md` **Type:** `fix`
**Summary:** The 27 drafts were already confirmed by the owner (10-05), plus 13 Quick Lunch Bites
(10-06/07): **55/364 dishes confirmed, 0 drafts**. A line-by-line check found the problems below;
each was fixed on the owner's instruction.

**Details:**

- **House Smoked Wings:** `wings` 12 → **1 each per piece** (owner: 1 piece = 1 wing).
- **Burrata Crostini** had no burrata (the model dropped it as "not in existing names"). Added
  `burrata` 0.5 oz per piece → **#355554** BelGioioso 2 oz balls (bought 05-28; the 4 oz #342939
  never bought). The 0.5 oz portion is my estimate (one 2 oz ball per 4 crostini) — owner to adjust.
- **Fresh Whole Fruit:** 12 `gala apple` per dozen, `orange` line removed (owner: fruit is mixed
  freely; keep it simple as 1 fruit = 1 apple).
- **Sourdough measured by the slice:** Ham & Swiss `sourdough` → `sourdough slices` (Turkey &
  Havarti already used it); the confirmed mapping (#981353) moved with it.
- **Stale notes:** the AI's notes described lines the owner had since corrected ("Pepperoni specced
  as ham" beside a pepperoni line). 8 cleared, 6 trimmed to the part still true, 7 accurate kept.
- **Buy-outs confirmed by the owner:** Coconut Shrimp (#369978) and Petite Beef Wellington (`beef en
  croute` #256290) are pre-made, like Bacon-Wrapped Scallops — the "scallops is the ONLY pre-made
  item" rule in CLAUDE.md/memory is superseded. 1st&10th Tee Bars (`n/a` placeholder) and Trail
  Mix are buy-outs too.
- **Found, folded into P4 (owner):** `orderUnits.js` `unitFit` counts a weight-sold product's
  inner packs as pieces — right for `72/3.17 OZ` buns, wrong for bags/loaves (coconut shrimp `4/3 LB`
  → 4 per case, ~54x over-order; cheese slices `6/1.5 LB` → 6, really 192). 27 of 382 lines; plus
  81 cross-class gaps (32 dishes). Written into design doc §7 + the P4 phase row. No code changed.
- **Buy-out lines named and mapped (owner):** `n/a` → `1st&10th tee bars` 12 each per dozen, confirmed
  as "not bought from this catalog"; Trail Mix 1 → **12** per dozen → #438899 Planters Nut & Chocolate;
  `chips` → #1073982 Frito Lay variety mix (bought 09-25); `havarti` → `havarti slice` (like the other
  sliced cheeses) → #207141 havarti slice twin pack (bought 09-26); `tortilla wrap 12"` → #245761
  Piancone garden spinach 12 in (owner's pick of three bought 12" tortillas).
- **Verified:** re-queried every changed dish and mapping; 55 confirmed / 309 unspecced unchanged;
  **ingredients 158/158 mapped and confirmed.**

---

### 2026-10-08 — Dish Drafter Stops Swapping Foods (draft-dish-specs v8 → v11)

**File(s) Changed:** `supabase/functions/draft-dish-specs/index.ts` **Type:** `fix` — deployed v9, v10,
v11 (v11 = v10 + a code comment).
**Summary:** The ingredient drafter treated its EXISTING NAMES list (158 names) as the only foods allowed,
so a dish naming anything new got the nearest listed food instead. Found reviewing the 10-07 drafts
(burrata dropped, tenderloin → flank steak, pepperoni → ham…) and in the 10-08 Action Stations drafts
(Beef Tenderloin and Sirloin → `shoulder tender`, Prime Rib → `roast beef` — still drafts, owner to fix).

**Details:**

- **Cause:** rule 9 said "when an ingredient appears in EXISTING NAMES, use that exact name" and nothing
  about one that does not; the list sat under a bare header. Each run resolved that differently.
- **Measured** (12 unspecced dishes naming foods not on the list, `parseOnly`, scored on 36 named foods;
  plus 5 Action Stations drafts, 8 foods):

  | Version | 12-dish set, per run | Swaps per run | Action Stations |
  |---|---|---|---|
  | v8 (3 runs) | 0 / 30 / 0 of 36 | 7 / 0 / 8 — and **0 new names** in the bad runs | 3 beef swaps (live) |
  | v9 (5 runs) | 33 every run | 1-2 (pecans → walnuts), **silent** in 3 | 8/8 every run |
  | v10 (5 runs) | 32-35 | 0, 2, 0, 1, 2 — **every one said in the note** | 8/8 every run |

  Foods already on the list kept their spelling in every run (15/15, 10/10).
- **Fix:** rule 11 — the list is spellings to reuse for the SAME food, new names are expected, never
  substitute (examples kept out of the test set: veal/pork, cashews/peanuts…). Rule 12 — every food a dish
  names appears under its own name. v9 also told the model never to report a substitution in the note:
  that made the walnut swaps SILENT, so v10 removed it — a swap now always shows in review.
- **Still open:** pecans → walnuts in 3 of 5 runs (noted when it happens); Dijon always becomes the
  existing `grain mustard` — owner to say whether they are separate purchases.
- **Owner:** peach cobbler IS Southern BBQ's dessert (menu says Strawberry Crumble Bars — the menu is out
  of date, the spec is right).
- Scorer and run outputs are in the session scratchpad (`drafter/score.py`), not the repo.

---

### 2026-10-09 — Drafter: Dijon Kept Separate, Batches of 4, Repeatable Check in the Repo

**File(s) Changed:** `supabase/functions/draft-dish-specs/index.ts`, `supabase/functions/draft-dish-specs/drafter_check.ts`
(new), `app/src/pages/DishSpecs.jsx` **Type:** `fix` + `test` — `draft-dish-specs` v11 → **v12**.
**Summary:** Owner: Dijon and grain mustard are separate purchases. The rule alone did not hold in a batch,
so the Dish Ingredients page now drafts 4 dishes per request instead of 8. The scorer from 10-08 is now
a Deno script beside `match_test.ts`.

**Details:**

- **v12:** rule 11's examples add "Dijon is never grain mustard" (owner's word, so the lamb's Dijon is no
  longer a blind test). Drafted ALONE the lamb got `dijon mustard` 4 of 4; inside a batch it still became
  the existing `grain mustard`.
- **Batch size is the lever** (same 12 dishes, `parseOnly`, scored on 36 named foods):

  | Batch | Runs | Named kept | Runs with a swap |
  |---|---|---|---|
  | 12 | 10 | 23-36 (one run fell back toward the old closed-list mode) | 2 + that one |
  | 8 (old app setting) | 6 | 34-36 | 2 (grain mustard) |
  | **4 (new)** | 12 | 35-36 | **0** |

  Small samples, but every point agrees: fewer dishes per request, fewer swaps. `DRAFT_BATCH` 8 → 4;
  time is not the limit. Beef set (5 dishes): 18/18 in every run at any batch size.
- **`drafter_check.ts`** — runs the DEPLOYED function N times (`[runs=5] [batch=4]`), scores named foods,
  swaps (whole words: "prime ribeye" is not the swap "prime rib"), existing-name reuse and new-name count;
  exits 1 on any swap. Reads the public anon key from `app/src/lib/supabase.js` and the live name list
  via `dish_ingredient_names`. Writes nothing. Confirmed dishes drop out over time (parseOnly skips them)
  — the check names them so they can be replaced.
- **Seen, not fixed:** Gemini sometimes returns malformed JSON → the function 500s (2 of ~60 calls). The
  page stops, keeps every earlier batch, and **Draft** again resumes — a click, not lost data. A one-time
  retry on a JSON parse failure would remove it.
- `npm run build` passes. **Owner:** 72 confirmed / 22 drafts / 270 unspecced (10-09); Beef Tenderloin
  is confirmed as `shoulder tender` — asked whether that is the kitchen's practice.

---

### 2026-10-10 — Drafter Retries Malformed JSON Once; Beef Tenderloin Respecced

**File(s) Changed:** `supabase/functions/draft-dish-specs/index.ts`, `supabase/functions/draft-dish-specs/retry_test.ts`
(new), data (`dish_ingredients`, `menu_dishes.spec_note`) **Type:** `fix` + `test` — `draft-dish-specs` v12 → **v13**.

**Details:**

- **Retry:** `callGemini` now wraps `callGeminiOnce`. A reply that is not valid JSON (`SyntaxError`, 2 of ~60
  calls on 10-09, each a failed batch) is retried ONCE; an API error or timeout is not. The retry gets only
  what is left of the same 130s budget (none if under 30s), so it cannot push a request past the gateway.
- **`retry_test.ts`** slices the real code out of `index.ts` (like `match_test.ts`) with fetch faked: good
  first answer = 1 call; malformed then good = 2 calls, retry used; malformed twice = SyntaxError after 2
  calls; HTTP 400 = 1 call. 4/4 + match_test 5/5 pass. **Mutation-checked:** removing the retry fails 2
  tests; retrying every error fails 1; file restored byte-identical.
- **Live:** v13 deployed; `drafter_check.ts` 4 runs — set A 35-36/36, 0 swaps; set B one run drafted the
  12oz Prime Ribeye as the existing `prime rib` (sampling; the retry does not touch the prompt).
- **Beef Tenderloin (Action Stations), owner:** "tenderloin should be tenderloin" — `shoulder tender` →
  `beef tenderloin` 20 oz per lb sold (still confirmed); note trimmed to "Mushroom bordelaise components
  included." `shoulder tender` stays on Grilled Beef Crostini. `beef tenderloin` has no product mapping yet.
- **P3 (10-10):** 82 confirmed / 12 drafts / 270 unspecced; ingredients 158 mapped / 41 unmapped (new
  names from the Action Stations and later drafts).

---

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
`migration` + `test` — `draft-dish-specs` v13 → **v21** (deployed), page change NOT pushed.
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
