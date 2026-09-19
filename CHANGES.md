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

---

## Detailed Entries

### 2026-09-15 — Session Housekeeping: CHANGES.md Repair, Docs and Vendor Data Committed

**File(s) Changed:** `CHANGES.md`, `docs/changelog/2026-08.md`, `.gitignore`,
`app/.claude/settings.local.json`, `Vendor Data/` **Type:** `chore` — housekeeping
only. **No feature code, no schema, nothing deployed.**
**Summary:** `/sc:load` turned up three defects in the 09-15 design entry and a pile of
uncommitted work from that session. All cleaned up, committed and pushed.

**Details:**

- **The 09-15 entry had been inserted mid-entry.** It landed before the last two
  paragraphs of the 09-07 entry, orphaning its "Also flagged" and "State" paragraphs
  under the wrong date. Moved back to 09-07 unedited.
- **09-15's state paragraph was inherited and wrong.** It claimed `main` was at
  `a3313c1` and in sync with origin. `main` was actually at `ed6dcfd`, one commit ahead
  and unpushed. Replaced with the real state.
- **Over the 500-line cap at 535.** Moved the 08-25 and 08-29 entries verbatim to
  `docs/changelog/2026-08.md` with one-line pointers, per the MOVE-never-delete rule.
  The 08-25 move was diffed against `git show HEAD:CHANGES.md` — 47 lines, identical.
- **Committed and pushed in three commits** (`a5b8b9d`, `8f4c8b8`, this one), which also
  carried the owner's 09-14 `ed6dcfd` off the local machine for the first time.
- **Vendor data is now tracked** at `Vendor Data/Order Guides/` — 13 raw PFG exports
  plus the master item list, the input P1 verifies against. Owner chose this knowingly
  after being told the supplier pricing lands in GitHub history permanently.
- **`.gitignore`: the `Vendor Data/PFG_Master_Item_List_09-06-26` rule is gone.** It
  never matched the real filename (missing `20` and `.xlsx`), so the master list had
  been committed in `ed6dcfd` despite it. Owner removed the line himself once the
  decision was to track the exports.
- **The master item list existed twice with different contents** — 167,232 bytes at
  `Vendor Data/`, 164,054 at `Vendor Data/Order Guides/`. Owner deleted the former.
  **Open: the design's 1,381-product baseline was measured before the duplicate was
  found, so P1 must re-confirm that number against the surviving copy rather than
  trusting the figure in the design doc.**
- `app/.claude/settings.local.json`: dropped four permission entries pinned to a dead
  session scratchpad path.

**State:** `main` at this commit, pushed, in sync with `origin/main`. Working tree
clean. Nothing deployed this session; production is untouched.

---

### 2026-09-16 — Catalog Baseline Re-Measured and Confirmed (closes the 09-15 open item)

**File(s) Changed:** none (verification only) **Type:** `chore`
**Summary:** The previous entry left P1's acceptance number in doubt because the master
item list had existed twice at different byte sizes. Re-measured from source. The number
holds and the duplicate was a false alarm.

**Details:**

- **Merged the 13 raw exports independently** (dedupe by `Product Number`, highest price
  wins within the batch): **1,381 products / 394 price-varies / 6 unpriced** from 3,008
  raw rows — matching the design doc on all three figures. Price basis parsed from the
  string suffix: 2,630 per-case / 370 per-lb / 8 empty.
- **The two master copies held identical product data.** Same 1,381 product numbers,
  zero price differences, identical sheet and row structure. They differ in exactly 14
  cells, all Index-sheet totals where one copy cached recalculated floats
  (`2856.141599999999` vs `2856.1416`). The deleted copy was recovered from
  `bf5bd4c^` to make the comparison rather than reasoning about it.
- **So the 09-15 caution was unnecessary** — whichever copy the original validation read,
  it got the same answer. P1's acceptance check is **1,381 / 394 / 6**, confirmed.
- Worth carrying: `git show <rev>:<path> > file` under PowerShell **corrupts binary
  files** (167KB xlsx came out 296KB of mangled text) — use the Bash tool. It parsed
  without throwing and produced plausible wrong numbers: a silent failure, not a loud one.

---

### 2026-09-17 — Supplier Catalog: Ingestion + Product Search (order guide P1)

**File(s) Changed:** `app/src/lib/catalogParse.js` (new),
`app/src/components/CatalogUploadPanel.jsx` (new), `app/src/pages/SupplierCatalog.jsx`
(new), `supabase/migrations/20260916000000_create_supplier_catalog.sql` (new),
`app/src/App.jsx`, `app/src/components/OfficeLayout.jsx`, `app/src/index.css`
**Type:** `feature` — P1 of the order guide design. **Committed, NOT pushed; not live.**
**Summary:** The office can load the Performance Foodservice order guide exports and
search every purchasable product with its real case price. This is the foundation the
BEO order lists will draw on; nothing about order lists changed yet.

**Details:**

- **P0 (the Gemini model upgrade) was SKIPPED** at the owner's call after his own
  research — the parse works and the upgrade risked more than it offered. P1 never
  depended on it.
- **Parsing lives in a pure module** (`catalogParse.js`): no React, no network, no xlsx
  import — the caller injects the sheet reader. That is what let the exact shipped code
  run headless against the 13 reference files before any UI existed.
- **Verified against the design's baseline, twice over.** Parsed: 3,008 raw rows → **1,381
  products / 394 price-varies / 6 unpriced**. Read back out of `supplier_products` after
  the real upsert: the same three numbers, plus **219 catch-weight** and **35 needing a
  manual pack size** — both figures the design predicted independently.
- **The refresh rules were tested, not assumed.** `category` is sticky because the upsert
  payload OMITS the column, relying on PostgREST updating only the columns it is given —
  someone else's library's behaviour. So: curated a category on a real row, re-ran the
  batch, confirmed it survived, `first_seen_at` held, `last_seen_at` advanced, table still
  1,381 with no duplicates. Probe row reset afterwards.
- **`case_price` is derived once at ingest**, never at read. 219 products quote a
  per-pound price; a read-time branch means some later call site forgets and prints a line
  ~50x low. Verified: beef at $5.1561/lb in a 6/10 LB case stores $309.37.
- **Three catch-weight products get no `case_price` on purpose** — priced per pound but
  packed by count, so the classes do not meet. A gap, not a guess. Same reason the 25
  `6/#10 CN` items carry no pack total: a #10 can is nominal, not a fixed measure.
- **The odd pack shapes drove the code, not the reverse.** Profiling all 3,008 rows first
  found 27 distinct formats; `6/#10 CN` fell through the regex because `#` sits
  mid-string. After the fix the unparsed set is exactly 25 cans + 2 CS + 2 FT + 6 counts.
- **The migration is additive** — two new tables, applied to prod. Menu, dish and mapping
  tables belong to later phases and were deliberately not created.
- **Verification split:** data path proven headlessly (above) and `npm run build` passes,
  but **the UI was confirmed by the owner in his own dev server**, not by me — `npm run
  dev` was blocked here by the permission classifier reading it as a deploy.
- **Open:** `category`/`item_group` are null for all 1,381 products — P1 ingests only the
  raw exports, so search is text-only with no category filter. The master item list
  already carries that categorisation and could seed it in one pass.

**Reflection pass, same day — a verification gap found and closed:**

- **The upload button had never actually run.** `supplier_catalog_uploads` held exactly
  one row, stamped by the node harness; the owner's dev-server session added none. What
  he confirmed was the page rendering and search working over products **the harness had
  loaded** — real verification of the read path, but the commit path was untested and I
  had let it read as done.
- **Cause: the harness retyped the upsert payload instead of importing it**, so it proved
  the table's contract and nothing about the shipped code. The two had already drifted —
  the harness stamped a UTC `price_as_of`, the component a local one. Same trap as the old
  BEO reconciliation gate, inverted: that gate shared the assembler's premise and agreed
  by construction; this one shared no code with what ships and so vouched for nothing.
- **Fixed by extracting `buildProductRows()`** into `catalogParse.js`, used by the
  component and imported by the harness. Re-ran: same counts, and the logged payload
  columns confirm `category`/`item_group` stay absent, which is what makes them sticky.
- **Corrupted both changelog files while tidying, and had to restore them.** PowerShell's
  `Get-Content` decodes UTF-8 as ANSI by default, so a `Get-Content`/`Set-Content -Encoding
  UTF8` round-trip bakes the mojibake in — 183 mangled sequences in `CHANGES.md`, 88 in the
  archive, and 7 had already reached commit `7416c60`. Restored from git and redone through
  encoding-explicit tooling, with the moved entries diffed line-for-line against their
  source revisions. **Never round-trip a UTF-8 file through bare `Get-Content`.**
- **Gap closed the same day — the browser path is now verified.** The owner loaded all 13
  exports through the page, which wrote a third `supplier_catalog_uploads` row (09-17
  17:35, 13 files / 1,381 products) alongside the two harness runs. Counts afterwards:
  **1,381 / 394 / 6 / 219 catch-weight / 35 needing a pack size** — unchanged, so the
  upsert updated in place rather than inserting. Confirmed by querying the side effect,
  not by the page looking right. **P1's acceptance criterion is met end to end.**

---

### 2026-09-17 — Catalog Categories Seeded From the Master List

**File(s) Changed:** `app/src/lib/catalogParse.js`,
`app/src/components/CategorySeedPanel.jsx` (new), `app/src/pages/SupplierCatalog.jsx`,
`app/src/index.css`, `supabase/migrations/20260917000000_seed_supplier_categories.sql` (new)
**Type:** `feature` — closes the open item on the P1 entry. **Committed, NOT pushed.**
**Summary:** All 1,381 products now carry a category and item group, and the catalog page
has a category filter beside its search box.

**Details:**

- **The raw exports have no category; only the master list does**, filing every product
  across 20 sheets with an `Item Group` column. Seeding is therefore its OWN action, not
  part of ingestion — the design keeps the merge on raw exports only.
- **A separate panel, deliberately.** Dropping the master into the order-guide uploader
  would feed it to the price merge; keeping two inputs in one drop zone invites exactly
  that. (The uploader already refuses it — the master has no `Product List Report` sheet —
  but a clear second control beats relying on an error message.)
- **One RPC instead of ~352 round trips.** The data holds 352 distinct
  (category, item_group) pairs, so a per-pair UPDATE from the browser would be that many
  requests and could leave the catalog half-categorised. `seed_supplier_categories(jsonb)`
  does it in one statement via `jsonb_to_recordset`, atomically.
- **The RPC fills only NULL categories**, which is what makes `category` sticky in
  practice rather than only in intent — re-running can never overwrite a curated value. It
  returns `seeded / skipped / unmatched` so a no-op is visible instead of looking like
  success.
- **Verified through the shipped parser and the real RPC** (imported, not retyped):
  1,381 parsed → **1,381 seeded, 0 skipped, 0 unmatched**; all 1,381 rows now have both a
  category and an item group; 20 categories whose counts sum to 1,381. **Re-ran it: 0
  seeded, 1,381 skipped** — the sticky rule proven, not asserted.
- **Data checks before writing any code:** every one of the 1,381 master rows has a product
  number, none has a blank item group, and **no product appears under two categories** — so
  the seed is not order-dependent. The parser reports a conflict count anyway rather than
  letting a future master resolve it by sheet order.
- **`supplier_categories()` backs the filter dropdown** — 20 rows with counts, instead of
  pulling all 1,381 products to the browser to dedupe client-side.
- **Untested:** the panel's own button. The categories were already seeded by the harness,
  so clicking it now correctly reports 0 seeded / 1,381 already set — which looks like a
  no-op. Clearing categories first would let that path be exercised properly.

---

### 2026-09-17 — Menu Dishes: PDF Drafting + Confirm UI (order guide P2)

**File(s) Changed:** `supabase/migrations/20260918000000_create_menu_dishes.sql` (new),
`supabase/functions/process-menu/index.ts` (new), `supabase/config.toml`,
`app/src/lib/menuDrafts.js` (new), `app/src/components/MenuUploadPanel.jsx` (new),
`app/src/pages/MenuDishes.jsx` (new), `app/src/App.jsx`,
`app/src/components/OfficeLayout.jsx`, `app/src/index.css`
**Type:** `feature` — P2 of the order guide design. **Not committed, not pushed.**
**Summary:** The 8 catering menu PDFs can be read into `menu_dishes` drafts and confirmed
at `/office/menus`. This builds the dish vocabulary a BEO line will be matched against in
P4; nothing about BEOs or order lists changed yet.

**Details:**

- **A model reads these menus, and that is the right call — for a reason worth keeping.**
  `process-beo` reads its table from PDF coordinates because a BEO is a generated grid.
  These menus are hand-designed marketing layouts, and the difference is concrete: on
  Breakfast the **price column extracts as a detached run** — eight dish names, then eight
  prices, in separate blocks — so linear text cannot say which price belongs to which
  dish. Aligning them needs to see the page. A geometric parser here would be the same
  tool applied to a problem that does not have the property it depends on.
- **Non-determinism is contained, not tolerated.** This runs once per menu, writes
  `status='draft'` only, and nothing downstream may use a dish until a human confirms it.
  The per-BEO path stays arithmetic, which is the whole architecture.
- **Verified against the source, dish by dish, not by eyeballing.** Plated Dinners: **80
  dishes**, matching a hand count of all five pages section by section (10 salads/soups,
  8 starch, 7 veg, 7 chicken, 9 beef-pork-lamb, 7 seafood, 3 pasta, 2 veg entrées, 14
  sauces, 13 desserts), every upcharge correct including `+$2.5` and the malformed `+3`
  on Local Sauteed Mushrooms. Page 1 — RSVP and seating-chart policy prose — correctly
  produced zero dishes. Custom Buffets: **44 dishes**, likewise an exact match.
- **One real parse error found, and left in place.** On Breakfast, 9 of 10 priced rows are
  right — including `$ ? /ea` correctly read as no price, `$90/tray`, and both
  section-level minimums copied down onto each dish beneath them — but "Sausage, Egg,
  Arugula, & Gouda Croissant" prints **no** price and was given `$9` from the row above
  it. Verified by reading the rendered page, since the text layer cannot settle it.
  Not prompt-tweaked away: a fix I cannot prove across all 8 menus is a fix I am guessing
  at, and this is exactly the class of error the confirm gate exists to catch.
- **Two deliberate departures from the design's §8 schema**, both from the real files:
  - **Added `price_unit`.** The menus state a price four different ways — `$8/ea`,
    `$18/person`, `$30/doz`, `$90/tray` — and `base_price` alone cannot tell P4 which,
    so the arithmetic would have to guess at the last moment.
  - **Omitted `effective_start`/`effective_end`.** Fall is Sept–Nov and Winter Dec–Feb
    **every year**; an absolute date range expires. `season` is stored; resolving a BEO's
    date to a season is P4's job, and P4 can add the shape it actually needs.
- **`unique nulls not distinct (name, menu_source, season)`** — not cosmetic. `season` is
  null on the six year-round menus, and under the default NULLS DISTINCT every re-parse
  of those menus would insert a full duplicate set instead of conflicting.
- **Re-drafting can never overwrite a confirmed dish**, and that rule lives in the
  database, not the caller. `upsert_menu_dish_drafts(jsonb)` is one statement whose
  `ON CONFLICT ... DO UPDATE ... WHERE status = 'draft'` makes the stickiness
  unforgettable, and it cannot leave a menu half-written. Proven, not asserted: a
  confirmed row whose re-draft carried a **different** upcharge kept its own value, a
  draft row updated, a new row inserted, and a dish repeated inside one payload deduped
  rather than throwing `cannot affect row a second time`. Returns
  `inserted / updated / skipped_confirmed` so a no-op is visible instead of silent.
- **The model swap was measured, not assumed.** `gemini-3-flash-preview` took 25s on the
  **one-page** Platters menu and blew the 130s gateway margin on 4-page Custom Buffets.
  `gemini-2.5-flash` does the 5-page Plated Dinners in 64s. This is the same conclusion
  `process-beo` reached for the same job on 2026-05-30, and is **not** a re-proposal of
  the P0 upgrade the owner cancelled — it is the model that finishes in time for this
  one function.
- **Confirmation volume was the design's top risk, so the list is keyboard-driven:**
  j/k or arrows to move, `c` to confirm and advance, `e` to edit, plus a per-dish
  "Not a dish" discard for a heading the model mistook for food. Bulk confirm is scoped
  to **what is on screen**, never "all drafts everywhere" — confirming a menu nobody read
  is the exact mistake the gate exists to prevent.
- **Identity is not editable in the review UI.** Changing `name`/`menu_source`/`season`
  would either collide with another dish's unique key or orphan the row from the menu it
  was drafted off. A misread name is a discard-and-redraft.
- **Verified end to end through the deployed function**, which is the shipped code path:
  Custom Buffets wrote 44 read / 44 inserted / 0 skipped. `menuSourceFromFilename` was
  run against the real 8 filenames — the two seasonal files correctly collapse to one
  `menu_source` separated by season, which is what the unique key needs.
- **Not verified:** the browser UI itself. The upload panel, the confirm/edit/discard
  mutations and the keyboard nav have only been compiled (`npm run build` passes), never
  clicked — the same gap that P1 hit, and it is not closed until someone drafts a menu
  from the page and a `menu_dishes` row changes status as a result.
- **Open:** three pricing-rule lines on Custom Buffets ("Additional Salad +$5",
  "Additional side +$4", "additional dessert +$4") draft as dishes and should be
  discarded; Breakfast's "Omelet Station" puts its **$100 flat setup fee** in `upcharge`,
  which is a per-person field, and lands under the wrong section.

---

### 2026-09-18 — Remaining 6 Menus Drafted; menu_dishes Identity Corrected

**File(s) Changed:**
`supabase/migrations/20260918000001_menu_dish_identity_includes_section.sql` (new)
**Type:** `fix` + data load. **Not committed, not pushed.**
**Summary:** Custom Buffets and Plated Dinners were confirmed by the owner (124 dishes).
Drafting the remaining menus exposed a real bug in P2's unique key, which was silently
dropping dishes; the key now includes `menu_section`.

**Details:**

- **P1 of this session's verification closed itself:** all 124 dishes came back
  `confirmed`, every one with a timestamp, across **96 distinct seconds** in two
  sittings — the signature of a human working down the list, not a bulk UPDATE. The
  review page's confirm path is verified. Nothing was discarded, so the three
  pricing-rule lines ("Additional Salad +$5", "Additional side +$4", "additional
  dessert +$4") are now confirmed as dishes and may want removing.
- **The bug: `(name, menu_source, season)` cannot hold one dish name twice on one
  menu.** Breakfast read 22 dishes and stored 21; Seasonal-Fall read 27 and stored 26.
  Both were genuine, and both the same shape — a name that legitimately appears in two
  sections at two prices:
  - Breakfast "Yogurt Parfait Bar" — standalone under *Fruit & Yogurt* at `$10/ea`
    min 12, **and** a *Custom Breakfast Buffet* upgrade at `+$6`. The $10 item was lost.
  - Fall "Shaved Brussels Sprout & Honeycrisp Apple Salad" — a plated *Starter Course*
    **and** a *Buffet Salad*. The buffet one was lost.
- **What made it dangerous was that it was silent.** The RPC's payload dedupe exists to
  stop `ON CONFLICT` throwing "cannot affect row a second time", and it cannot tell a
  duplicate *reading* of one dish from two different dishes sharing a name. Nothing in
  the UI would ever have shown the loss — **only the `read` vs `inserted` counters
  caught it**, which is the argument for having the RPC return all three numbers
  instead of a bare success.
- **Fixed by widening the key to include `menu_section`.** This splits the two real
  cases while still collapsing the one the dedupe was built for: the cold hors
  d'oeuvres repeat verbatim across both pages under the *same* heading, so they stay
  one row. Widening a unique key cannot conflict existing rows, so the 124 confirmed
  dishes were unaffected.
- **The cost, accepted deliberately:** identity now depends on a model-generated field,
  so a re-draft that renames a section ("Entrées" vs "Entrees") inserts a second row
  rather than updating the first. That is a duplicate a human can see and discard —
  strictly better than a dish that silently disappears.
- **Loaded:** Breakfast 22, Hors d'Oeuvres 28, Platters 6, Seasonal-Fall 27,
  Seasonal-Winter 25.
- **Still not exercised:** the upload panel's own button. Every menu so far was drafted
  by the harness calling the deployed function — the same edge function the browser
  calls, but `MenuUploadPanel.jsx` itself (file read, base64, the sequential loop,
  season from filename) has never run. **Quick Lunch Bites was deliberately left
  unloaded** so that path can be tested by doing real work rather than by a no-op.
