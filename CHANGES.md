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

---

## Detailed Entries

### 2026-09-06 — BEO Qty Column Emphasis (UNCOMMITTED — awaiting owner sign-off)

**File(s) Changed:** `app/src/index.css`, `app/src/pages/EventsBanquetsPage.jsx`
**Type:** `feature` — **in the working tree only, not committed, not pushed**
**Summary:** Owner overlooked the Qty column on a BEO during service and it cost a
bad look. The quantity now renders as a filled blue chip centred against its row on
desktop, instead of a small number pinned to the top-right of a tall cell.

**Details:**

- **The diagnosis was spatial, not brightness.** Qty was already `font-weight: 700`
  in accent blue, so "make it stand out" had to mean more than emphasis. On a
  multi-line dish the grid cell stretches to ~200px and the number sits top-aligned
  at the far right — the eye tracks the dish text and the number is nowhere near it.
  Confirmed by looking at the real Linkside card: a 7-line dish with one small `11`
  about 180px from the last line it applies to.
- **Owner picked the chip after comparing four treatments** built behind a temporary
  toggle (current / tinted rail / solid chip / big-no-fill) on live data. Scaffolding
  removed afterwards; only the chosen treatment remains.
- **`align-self: center` is the load-bearing part**, not the fill. It stops the grid
  cell stretching, so the number sits beside the middle of the block it applies to.
- **Blank quantities had to be handled or the fix would ship a defect.** Items can
  legitimately carry `qty: ""` (the BEO prints Qty once per section, and omits it at
  headcount 0), which would have rendered as an *empty blue pill* — worse than the
  invisible whitespace it replaced. `.beo-item-qty:empty` suppresses the chip.
  Verified on Rivalry Run 5k, whose `Custom Buffets` row has no printed qty. This is
  NOT the "flag blanks" feature the owner declined; blanks still show as nothing.
- **The blue stays hardcoded, deliberately.** `var(--accent)` is orange in office and
  cyan in FOH; the BEO table is meant to read the same in all three shells, which is
  why the original code hardcoded `#3b82f6` rather than using the token. The qty
  colour moved from an inline style into CSS (inline beats classes), which made the
  local `accentBlue` const unused, so it was removed.
- **Sized down twice at the owner's request** — `1.05rem/4px 12px/42px` →
  `0.95/3px 9px/30px` → `0.85rem/2px 6px/18px`. At the final size the number is
  smaller than the surrounding table text (`0.92rem`), so the chip now carries its
  emphasis on fill rather than scale.
- **Open:** mobile is untouched by design (the miss happened on desktop, and the
  `<=768px` reflow already puts qty beside the label) — but the phone layout was
  never actually viewed, a window resize failed to take. Owner has not seen the final
  size on his own screen. Nothing committed; `main` is at `7b576f7`.

### 2026-09-07 — Order Guide in BEO Order Lists (BRAINSTORM ONLY — no code written)

**File(s) Changed:** `claudedocs/requirements_beo_order_guide_2026-09-07.md` (new)
**Type:** `docs` — requirements discovery via `/sc:brainstorm`. **No feature code,
no schema, no migration, nothing deployed.**
**Summary:** Owner asked to feed the food supplier's order guide into the existing
"generate order from BEO" and prep-list features so lists pull from real purchasable
items, with pricing and quantity scaled to guest count. Discovery turned up two
findings that reshaped the approach before any code was written.

**Findings (verified against repo + prod DB, not assumed):**

- **Recipes cannot scale — there is no yield.** Across 494 `workbook_sheets`: 1 sheet
  mentions "yield", **0 say "serves"**, and the 11/25 hits for "portion"/"batch" are
  prose inside assembly steps. The template is `RECIPE:` / header row /
  rows 3–23 ingredients / row 24 `Assembly:` / rows 25–32 method. Absolute batch
  quantities with no denominator cannot be divided down to a headcount.
- **Dish-level recipe coverage is effectively zero.** Owner had just rewritten the
  entire catering menu; existing recipes are *components* (sweet and sour sauce,
  mushroom duxelles), never whole dishes. Owner initially chose "scale from existing
  recipes" believing coverage was there — his own next answer showed it wasn't, so
  the design changed rather than proceeding on the stated pick.
- **411 of 494 sheets already carry `Unit Cost` / `Total Cost`**, which will drift
  from catalog pricing. Decided: catalog is authoritative and refreshes recipe costs.
- **Catalog only, no purchase history.** Every quantity must be derived, never
  recalled — "learn from what we actually ordered" is off the table.
- **Gemini models are several generations stale.** 9 call sites on
  `gemini-3-flash-preview` (a *preview* build) plus one `gemini-2.5-flash` and one
  `gemini-3.1-pro-preview`; Google's GA flash line is now at 3.8.

**Core decision — inference moves OUT of the per-BEO path.**
The catering menu is finite and owner-authored, so each dish is defined once
(AI drafts → owner confirms → stored), after which generating an order from a BEO is
pure arithmetic with **no model call**. This is the material difference from the
portion-scaling feature scrapped 2026-07-17, which ran inference on every BEO and so
churned run-to-run and could not be verified — the same non-determinism CLAUDE.md
already warns about. Same seed-and-confirm pattern is used for the three other
one-time inputs: product matching, dish specs, and recipe yields.

**Owner's decisions:** catalog-only via CSV/Excel upload; wants real product names +
cost total + guest-count quantity + pack/case rounding; quantity via a mix of
"portion rule you set" and "AI infers" (his words), on a newer Gemini; product
matching = AI proposes, confirm once, stored forever; scope stays **per-BEO** (not a
combined cross-event roll-up); portions anchored to recipes where they exist, with a
dish ingredient able to **point at a component recipe**; prep list **out of scope**
for v1; catalog price wins over recipe cost, and refreshes it.

**Open — blocks design:**

- **Unit conversion is the top unresolved risk.** Recipes measure in `Cups`/`T`;
  catalogs sell by `lb` and `50# case`. Volume→weight needs a **density per
  ingredient**, which exists nowhere in this system. Unresolved on purpose — this is
  the class of hidden complexity that sank the July build.
- Need two files from the owner: the **supplier order guide export** and the
  **catering menu**. Their real columns and size drive the ingestion design.
- Non-blocking: raw vs finished weight, overage buffer, per-BEO case rounding
  over-buying across events, catalog re-upload cadence, off-menu BEO dishes.

**Also flagged:** the model upgrade should ship as its **own change, before** this
feature — it alters BEO parsing behaviour too, and shouldn't be confounded with a new
feature's first run.

**State:** `main` at `a3313c1` ("qty visual update"), in sync with `origin/main`. The
2026-09-06 qty-chip work **was committed** in that commit — an earlier draft of this
entry claimed it was still uncommitted, which was wrong: it trusted a stale memory note
instead of `git log`. This session wrote docs only and committed nothing.

---

### 2026-09-15 — Order Guide Design (DESIGN ONLY — no code, no migration)

**File(s) Changed:** `claudedocs/design_beo_order_guide_2026-09-15.md` (new)
**Type:** `docs` — architecture via `/sc:design`. **No feature code, no schema
applied, nothing deployed.**
**Summary:** Owner delivered both blocking files — the 13 raw PFG exports
(`Vendor Data/Order Guides/`) and the 8 catering menu PDFs (`New Catering and Event
Menus 2026/`). All three blocking questions from the 09-07 requirements are now
closed, and the design is written against measured facts rather than assumptions.

**Details:**

- **The deterministic merge was proven against the AI-built master.** Dedupe by
  `Product Number` + highest-price-wins-within-batch over the 13 raw exports
  reproduces the master exactly: **1,381 products / 394 price-varies / 6 unpriced**,
  all three matching. 3,008 raw rows in. This makes `PFG_Master_Item_List` disposable
  — the app can rebuild it from source with no AI.
- **All 13 exports share one header signature**, header on row 7, list name on row 2.
  `Price` encodes its own basis in the string (`$54.46` vs `$6.1199/lb`), so the
  master's `Price Basis` column is **parsed, not inferred** — 2,630 per-case /
  370 per-lb / 8 empty.
- **Highest-price-wins must scope to one upload batch, not across time.** Across
  uploads it is a ratchet that can never come down. Called out explicitly in the
  design as a rule, not a detail.
- **`case_price` is derived at ingest, not at read.** The 219 catch-weight items are
  the ~50×-wrong-line failure mode; computing it once removes the chance that a
  future call site forgets the branch.
- **Q1 (unit conversion / density) is largely dissolved.** 84.9% of the 1,141 food
  products are weight, 7.7% count, 5.2% volume, 2.2% #10 cans. Dish-spec portion
  units are constrained at entry to `oz|lb|ct|each|floz`, and cross-class conversion
  is forbidden — a mismatch is a gap with `gap_reason`, never a guess. Density, the
  one input that exists nowhere in this system, is never required.
- **Correction to a claim I made on 09-14:** I said the menu file names map onto BEO
  left-column labels. They do not. That was inferred from parser labels in this file
  rather than from live data. Real BEOs carry line types (`Buffet`, `A La Carte
  Ordering`, `Rentals`, `Services`) and hold the dish names inside a newline-joined
  description string. The design adds a `beo_dish_matches` table for the free-text
  join, which the requirements doc had not anticipated.
- **`qty` is the multiplier, not `guest_count`** — one 90-guest event carries 82
  turkey / 8 gluten-free / 37 ham bagged lunches.
- **Menus supply yield the recipe library lacks** ("Serves 20", "Minimum 20
  pieces/type"), partially answering finding F1. They are also **season-scoped**
  (Fall Sept–Nov, Winter Dec–Feb), a requirement that was not in the 09-07 doc.
- **Scale flagged as the top risk:** ~250–300 dishes across 18 pages means NFR-4's
  "one or two sittings" is not achievable. Design phases the confirmation pass by
  menu (Custom Buffets + Plated Dinners first) so the feature is useful before it is
  complete, rather than pretending the estimate holds.
- Phasing: P0 Gemini upgrade (own change, first) → P1 catalog ingestion → P2 menu
  ingestion → P3 dish specs + mappings → P4 runtime arithmetic → P5 recipe cost
  refresh. P1 verifies against the 1,381 baseline; P4 verifies byte-identical output
  on the same BEO twice.

**State:** `main` at `ed6dcfd` ("menus, and changes for order guide work", committed
2026-09-14 by the owner), **one commit ahead of `origin/main` — not pushed**. That
commit carries the 8 menu PDFs, the 09-07 requirements doc, and `docs/changelog/2026-08.md`.
This session wrote docs only and committed nothing: `claudedocs/design_beo_order_guide_2026-09-15.md`
and the 13 raw exports under `Vendor Data/Order Guides/` are still untracked.

---

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
