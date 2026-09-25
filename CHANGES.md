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

---

## Detailed Entries

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

---

### 2026-09-19 — "Additional Salad" Is a Price Rule, Not a Dish

**File(s) Changed:**
`supabase/migrations/20260919000000_menu_dishes_price_rule_flag.sql` (new),
`app/src/pages/MenuDishes.jsx`
**Type:** `fix` — **not pushed.**
**Summary:** The three "Additional X" rows on Custom Buffets state a selection
surcharge, not food. They are now flagged so P3 can never give them ingredients.

**Details:**

- **The owner's explanation (2026-09-19):** the $38 buffet covers one salad, two sides,
  two entrees and one dessert. Anything past that count costs extra, and **which dish it
  is stays unknown until the event is ordered** — pick Caesar and Pasta Salad, and the
  Pasta Salad becomes the +$5 one, even though Pasta Salad carries no upcharge of its
  own.
- **Why this is a correctness problem and not bookkeeping:** the real second salad is
  ALREADY its own row and gets ordered on its own. Ingredients attached to "Additional
  Salad" as well would order that food **twice**.
- **`upcharge` conflates two different things**, now recorded rather than left to be
  rediscovered as a bug: an INTRINSIC premium (Chopped Cobb is +$5 whenever chosen) and
  a POSITIONAL surcharge (any second salad is +$5 wherever it lands). Separating them
  needs the package composition, which is pricing — explicitly out of v1 scope, since
  the order guide buys food rather than quoting menu prices.
- **`is_price_rule` is curated and sticky**, like `supplier_products.category`: it is
  absent from the upsert's ON CONFLICT SET list, so a re-draft cannot reset a human
  judgement. **Proven on the weak case, not the easy one** — a *draft* row carrying the
  flag, where the update actually runs: upcharge went 4 → 99 and source_page → 3 while
  `is_price_rule` held. Testing only the confirmed row would have proved nothing, since
  the status guard alone would explain it.
- **`orderable_menu_dishes` view** is where P3 draws its work: confirmed AND not a price
  rule. The exclusion lives in the database so it cannot be forgotten at a call site —
  the same argument that put the confirmed-dish protection into the RPC.
- **A case-sensitivity bug caught by checking the result.** The first UPDATE used an
  exact `IN` list and flagged only 2 of 3 rows: the PDF prints "additional dessert" in
  lowercase and the model stored "Additional dessert". Re-run case-insensitively; the
  migration file carries the corrected form and a note saying why.
- **Owner confirmed the printed menu is right at +$4** for an additional side (he had
  said $5 in conversation). No data change — $4 was already what the parse stored.
- **Reconciles:** 232 dishes = 121 orderable food + 3 price rules + 108 still to confirm.
- **The review UI now has three outcomes** instead of two: Confirm (real food), Price
  rule (`p` — real money, no ingredients, row kept), Not a dish (deletes noise the model
  misread). Compiled, not clicked.

---

### 2026-09-19 — Menu Upload Accepts Word (.docx)

**File(s) Changed:** `supabase/functions/process-menu/index.ts`,
`app/src/components/MenuUploadPanel.jsx`, `app/src/lib/menuDrafts.js`,
`app/package.json` (+ `mammoth`)
**Type:** `feature` — **not pushed.** `process-menu` deployed v5.
**Summary:** `/office/menus` now takes Word files as well as PDFs. Verified against the
club's real `Old_Hawthorne_Fall_Menu.docx`: **87 dishes, every section matching a hand
count of the source.**

**Details:**

- **Gemini cannot read a .docx at all.** Its document vision only meaningfully
  understands PDF; other types are treated as plain text, and a .docx is a zip, so raw
  bytes would arrive as garbage. Checked the Google docs rather than assuming. So the
  file must be converted, and the only question was where.
- **Converted in the BROWSER, not the edge function — and that was measured.** The first
  build did it server-side with `npm:mammoth`; resolving it and its eight dependencies on
  a cold start pushed the request past the 130s gateway and **failed the first upload
  every time**, succeeding only on a retry (70-95s warm). A menu is loaded perhaps once a
  season, so a cold function is the NORMAL case here, not the rare one. Mammoth now runs
  client-side behind a dynamic `import()`, so it is a **separate 396 kB chunk (124 kB
  gzipped) fetched only when a Word file is dropped** — the main bundle is unchanged, and
  the function is back to zero npm dependencies, matching the PDF path it competes with
  for latency.
- **The prompt is now a shared core plus ONE swappable section.** Schema and semantics
  are identical whatever the file was; only how a dish is FOUND differs. The PDF section
  keeps the spatial rules; the Word section describes markup. Sending HTML with the
  PDF's "align each price with the dish it is vertically level with" would have been
  instructions about a page that no longer exists.
- **Two characters mean opposite things in the same document, and guessing would have
  been silent garbage.** `·` (middle dot) SEPARATES dishes in an inline run
  (`Salads (pick one) — Garden Salad · Caesar Salad · Chopped Cobb +$5`), while `•`
  PREFIXES a single dish name in the seasonal callout. My first draft named the wrong
  one, having assumed "bullet" from the extracted text; **the real markup came from
  running mammoth locally under Deno before deploying.**
- **Rule 7 was dropping a real dish.** "A dish listed twice is one dish" made the model
  discard "Country Style Green Beans" from *Plated Dinner — Vegetable Side* because it had
  already emitted it under *Custom Buffet — Sides*. Those are different rows under the
  identity fixed yesterday, and they are priced separately. Rule now dedupes **within a
  section only**; the re-run went 86 → 87 dishes and Vegetable Side 3 → 4, matching the
  page. Found by counting against the source, not by reading the output and nodding.
- **Sections are qualified by menu part** ("Plated Dinner — Dessert", not "Dessert")
  because one Word file holds Custom Buffet, Themed Buffets and Plated Dinner, each with
  its own Salads and Dessert — bare names would collapse different dishes into one row.
- **The source's own broken price survived as a gap:** the Fall menu prints
  "Sliced Tenderloin +$" with no number, and it came back `null` rather than guessed.
- **Fixed a latent season bug found on the way:** `fall` never matched
  `Old_Hawthorne_Fall_Menu` because `_` is a word character, so an underscore-named
  seasonal file would have been filed with no season at all. The separator class is now
  explicit; "Waterfall" and "WinterfellFeast" still correctly do NOT match.
- **Local Deno turned out to be installed**, which is what made it possible to test
  mammoth's real API before deploying — `{buffer: Uint8Array}` works, `{arrayBuffer}`
  fails with the unhelpful "Could not find file in options". `SUPABASE_ACCESS_TOKEN` is
  set but **401s**, so deploys still go through the MCP tool.
- **NOT loaded into the database.** Every run was `parseOnly`; `menu_dishes` still holds
  the 232 rows from the PDFs. See the open question below before loading any Word menu.
- **Open — these Word menus are a DIFFERENT menu from the PDFs already confirmed.**
  `Old_Hawthorne_Fall_Menu.docx` carries six Themed Buffets (Southern BBQ $41/person,
  Fiesta Feast $43 …) that appear nowhere in the PDFs, and a condensed Custom Buffet
  (5 sides, against 13 in the PDF). Its filename resolves to `menu_source='Seasonal'`,
  `season='fall'` — **the same identity as the already-confirmed Seasonal-Fall PDF rows**,
  so loading it would mix two menu versions under one key. Which version is current is
  the owner's call.

---

### 2026-09-21 — Menus Wiped; Price Quantity Bug Fixed Before Reload

**File(s) Changed:** `supabase/migrations/20260921000000_menu_dish_price_qty.sql` (new),
`supabase/functions/process-menu/index.ts`, `app/src/lib/menuDrafts.js`,
`app/src/pages/MenuDishes.jsx`
**Type:** `fix` — `process-menu` deployed v8. **Not pushed.**
**Summary:** The owner reported the prices were wrong across every menu. One systematic
bug was ours and is fixed; the rest is that every source document parsed so far was an
old version. All 232 rows wiped at his instruction, ready for the correct files.

**Details:**

- **Hors d'oeuvres were 20x too expensive, on 27 of 28 rows.** The menu prints
  "Vegetarian — Starting at $85 for 20 pieces" and prompt rule 5 said to store
  `base_price 85, price_unit 'piece'` on every dish in the group — which reads as **$85
  PER PIECE** against a real $4.25. Two distinct errors were tangled in that one rule:
  - **Nothing could express "a price that buys several."** `price_qty` now records it
    (`base_price` buys `price_qty x price_unit`), so "$115 for 20 glasses" is
    representable at all. Defaults to 1, so no existing row changes meaning.
  - **"Starting at" is a group FLOOR, not a dish price** — the word says outright the
    dishes do not all cost that. Those prices are now left empty with the wording kept
    in description. An honest gap beats a number wrong for most of the dishes carrying
    it. Rule 5 is also now **silent when a dish carries its own price**, since the new
    hors d'oeuvres menu prices each item individually.
  - **A quantity basis on a SECTION HEADING now carries down onto each dish**, the way a
    minimum already did — the new hors d'oeuvres state "per 20 pieces" once on the
    heading, not on every line.
- **The confirm gate held.** All 28 affected rows were still drafts; nothing wrong had
  reached confirmed data.
- **A silent-failure hazard found while testing, and closed.** The prompt splices its
  source-specific rules in at an anchor string, and rewording rule 3 broke that anchor —
  the only symptom would have been a quietly worse parse with **no layout rules at all**.
  Assembly now throws when the anchor is missing, and a local Deno harness asserts both
  paths splice correctly **against the real file** (it slices the actual source rather
  than retyping it).
- **Local had drifted from deployed** — the anchor was corrected in the deploy payload
  but not in the file on disk. Caught by grepping rather than assuming. Both now match.
- **All 232 rows deleted at the owner's explicit instruction**, including 124 he had
  confirmed and the 3 `is_price_rule` flags. Table, constraints, RPCs and the
  `orderable_menu_dishes` view are untouched — only data. This was necessary because the
  confirmed-dish protection would otherwise have **refused the corrected prices** and
  reported it only as `skipped_confirmed`.
- **A verification lesson worth keeping.** The earlier claim "80/80 exact, every upcharge
  correct" compared the parse against the SAME PDF it came from. That is a fidelity
  check, and it was reported as a correctness check. It cannot detect a stale document or
  a wrong price on the page, and the owner found what it could not.

---

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
