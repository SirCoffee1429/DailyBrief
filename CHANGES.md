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

---

## Detailed Entries

### 2026-08-18 — Codex/ChatGPT Tooling Quarantined

**File(s) Changed:** `.gitignore`, `CLAUDE.md`
**Type:** `config`
**Summary:** Connecting the repo to Codex/ChatGPT added `AGENTS.md`, `.codex/`
and `.agents/skills/`. None were ever committed or pushed. The bundle was
removed and all three are now gitignored.

**Details:**

- **It copied config, not the project.** `AGENTS.md` is a converted copy of
  `CLAUDE.md`; `.codex/agents/feature-prioritizer.toml` ports this repo's own
  agent; `.agents/skills/` was 188 files / 3.4 MB of the everything-claude-code
  bundle — the same bundle deliberately disabled on 2026-07-31. Source files
  untouched.
- **`.agents/skills/` and `.codex/` removed** (moved to session scratchpad, not
  hard-deleted; Codex regenerates them anyway). `.agents/rules/` is the owner's
  own tracked content and was left alone.
- **`AGENTS.md` deliberately kept on disk.** It carries "do not make any changes
  or create any files or folders" — Codex is advisory only, Claude Code does the
  editing and deploying. Deleting it would have removed the one instruction
  restraining Codex.
- **Known defect, left as-is by owner's call:** AGENTS.md's conversion did a
  literal find-and-replace producing `~/.Codex/...` paths that do not exist. Noted
  in CLAUDE.md so a future session isn't misled.
- Real production risk is a push to `main` (Vercel auto-deploys it), not these
  files on disk.

---

### 2026-08-19 — BEO Exclusion Filter for ReserveCloud Daily Packets

**File(s) Changed:** `supabase/functions/receive-beo-email/index.ts` (v5 → v7),
migration `20260819000000_add_excluded_events_to_pending_beo_imports.sql`
**Type:** `feature` + `migration`
**Summary:** ReserveCloud now sends a daily packet of every BEO directly, rather
than Rhi emailing one and it being forwarded. Owner added an exclusion list for
recurring club events the kitchen does not cook for. Reviewed, hardened and
tested end to end against production.

**Details:**

- **The owner's filter was correct but not deployed.** Live was still v5 with no
  filtering at all, so the first ReserveCloud packet would have imported every
  excluded event.
- **Exact whole-name matching kept, by owner's call.** ReserveCloud uses fixed
  recurring names, and the risk is asymmetric: an extra card costs one click,
  while a wrongly-excluded BEO never reaches the kitchen. `"Bridge Group"` and
  `"Bridgewater Wedding"` both still reach review, deliberately.
- **Apostrophes are stripped, not standardised.** Found by testing, not
  inspection: a BEO reading `Ladies’ League` came back from the parser as
  `Ladies League` with no apostrophe at all when the glyph did not render, and as
  `Ladies' League` with an ASCII one when it did. Matching on any single spelling
  would silently miss the event. Normalisation now removes `' ' ' ʼ ´` and
  collapses whitespace, so all three spellings are one key. This does not widen
  matching.
- **New `excluded_events jsonb` column.** Excluded events were being dropped with
  only a count in the logs, and a fully-excluded packet had `parsed_events` set to
  `[]` — so an over-broad rule would have made a real BEO vanish with nothing to
  find it by. Edge logs expire in days, so the record lives on the row. Excluded
  names are also logged by name, not just counted.
- **Discard path now checks `.select()`** for zero matched rows, matching the
  pattern the rest of this function already uses. A nameless event is never
  excluded — it goes to review where a human can see it.
- **Verification:** 20 unit cases on the matcher, all passing. Five synthetic BEO
  packets sent through the live webhook: a mixed packet kept
  "Thompson Rehearsal Dinner" and excluded "Bridge"; an all-excluded packet went
  to `discarded` with "Canasta, Stag Night" recorded and correctly wrote no bell
  notification; a real WinAnsi curly apostrophe and a bare "Ladies League" both
  excluded. `npm run build` clean (4.71s). All 5 test rows and 2 test
  notifications deleted; 17 live BEOs untouched.
- **Leftover:** 5 `claude-test-*.pdf` files in the `beo-emails` bucket. There is
  no DELETE policy on that bucket (the function writes with the service role), and
  direct deletion from `storage.objects` is blocked, so they need removing from
  the Supabase dashboard.
- **Not addressed:** a daily packet re-sends events already approved, so expect
  repeat review cards; the diff panel shows unchanged events collapsed. Packet
  size vs the 130s parse budget is untested with a real full-day packet.

---

### 2026-08-19 — Fetch BEO Packets from ReserveCloud Links

**File(s) Changed:** `supabase/functions/receive-beo-email/index.ts` (v7 → v8)
**Type:** `feature`
**Summary:** The first real ReserveCloud packet was refused with "no PDF
attachment". ReserveCloud's scheduled task emails a LINK, not an attachment, so
the function now fetches the packet when no attachment is present.

**Details:**

- **Not a sender or subject problem.** The refusal was `no PDF attachment` at
  07:33:23 — the mail reached the function fine. There are no sender or subject
  gates to fail. `noreply@noreply.reservecloud.com` and the subject were never
  examined.
- **Two hops, traced against the real link, not guessed:**
  `/web/token/process/<a>/<b>` 303s to
  `/pub/selfService/viewBatchDocumentResults/<c>/<d>` (139KB HTML), which carries
  exactly one href — the same path with `view` → `download` — returning
  `application/pdf`. Neither hop needs a login.
- **Attachment still wins when present**, so if ReserveCloud's "attach" option
  ever starts saving (it currently will not save for the owner), this path stops
  being used with no code change. That remains the better long-term fix: a link
  fetch breaks if their page layout changes or the link expires.
- **The fetch runs in the background task, not the handler.** The webhook acks in
  ~1.8s, and a dead or expired link fails into `parse_failed` — the same visible
  path a bad parse uses — rather than holding the webhook open.
- **Guards:** the download is verified to start with `%PDF-` so an HTML error
  page served with a 200 fails loudly instead of reaching Gemini as a "PDF".
  Base64 conversion is chunked; spreading a 270KB packet into
  `String.fromCharCode` blows the call stack.
- **Exclusion list validated against real data at last.** The live packet held 24
  pages / 22 events. All 8 exclusion entries matched real events; 11 events
  excluded, 11 kept, zero false positives. Two findings worth keeping:
  ReserveCloud writes `POPs Golf` and `POPs Poker` with a capital "POP" (4 pages
  would have been missed by case-sensitive matching), and the same packet
  contains `Ladies' League` (excluded) alongside `Ladies Night Out` and
  `Ladies' Night League` (both correctly kept) — which is why exact whole-name
  matching was the right call over any fuzzy match.
- **Verification:** 11 unit cases on link extraction, all passing. A real
  24-page/274KB packet parsed in 83s directly and the full webhook path resolved
  in 42s: link fetched, PDF stored, 22 parsed, 11 kept, 11 excluded.
  `npm run build` clean.
- **Open:** link expiry is unknown, so a packet that fails after the link dies
  cannot be re-fetched — though `pdf_path` preserves the original. The daily
  packet re-sends every event each day, deduped only by Postmark MessageID, so
  expect ~11 review cards daily with most unchanged.

---

### 2026-08-24 — BEO Single-Day Events Stop Reporting a Phantom End Date

**File(s) Changed:** `supabase/functions/process-beo/index.ts` (v16 → v17),
`.gitignore`
**Type:** `fix`
**Summary:** A BEO's "Event Date(s)" row always prints a range, so a single-day
event reads `08/21/2026 - 08/21/2026`. Gemini echoed both halves, giving
single-day events an `event_end_date` equal to `event_date` and making every
unchanged event report an "End date" change in the review queue.

**Details:**

- **Not model drift — the model was reading the page correctly.** The prompt's
  `// last day if multi-day, else null` asked Gemini to contradict the document on
  24 of the packet's 27 pages. It complied on the 08-21/08-23/08-24 packets and did
  not on 08-22, which is why the symptom looked intermittent.
- **Prompt rule rewritten to describe what the model actually sees** — it names the
  "Event Date(s)" row and its range format instead of stating the convention abstractly.
- **Deterministic guard added after `JSON.parse(rawOutput)`**, so compliance stops
  mattering. Placed before the mode split so Mode A (insert), Mode B (approve-replay)
  and Mode C (`parseOnly`) all agree. `parseOnly` was the load-bearing one: it
  returns `parsedEvents` raw, so `pending_beo_imports` was storing the same-day date
  and `beoDiff.js` (which diffs `event_end_date` as a scalar) reported a phantom
  change on every otherwise-unchanged event.
- **No user-visible damage in the events list.** `EventsBanquetsPage.jsx:714` and
  `:962` already guard with `event_end_date !== event_date`, so no bogus
  "Aug 22 – Aug 22" range ever rendered. `banquet_event_orders` was also clean at
  the time of the fix — 12 rows, 11 null, 1 genuine range — because the daily
  re-send healed the 08-22 damage via Mode B in-place updates.
- **Verification:** the real 27-page/289KB packet (the same one that produced the
  bug) run through deployed v17 with `parseOnly`: HTTP 200 in 87.8s, 23 events,
  22 `null`, 1 genuine range (The Eliminator, 08-28 → 08-30), zero `end === start`.
  Cross-checked against a direct pdfjs text extraction of every `Event Date(s)` row:
  24 same-date pages, 3 multi-day pages, one event. They match exactly.
  `npm run build` was not run — no frontend file changed and it does not compile
  Deno functions; the production parse against real data is the stronger gate.
- **`BEOs/` gitignored.** The reference packet had been staged for commit. Page 1
  alone carries a member's home address, personal email, two phone numbers and
  member number, and every page repeats the club contact's direct line. Unstaged
  and ignored; the file stays on disk for parser work.
- **Pre-existing, not addressed:** `app/sample-data/test_beos/Event-documents (1.pdf`
  is already tracked and in git history with the same class of data. Scrubbing it
  needs a history rewrite — owner's call.
- **Note:** `supabase functions deploy` returned 401 (CLI not logged in); deployed
  via the Supabase MCP instead. `verify_jwt` left at `false`, matching config.toml.

---

### 2026-08-25 — BEO Parse Was Non-Deterministic; Same PDF, Different Structure Daily

**File(s) Changed:** `supabase/functions/process-beo/index.ts` (v17 → v21)
**Type:** `fix`
**Summary:** Owner reported the morning's packet "changed the format/layout again."
The BEO had not changed — the parse had. The same PDF was being re-grouped
differently every day, producing between 43 and 91 items for the same ~12 events.

**Details:**

- **Not caused by the v17 end-date change.** The identical failure — buffet dishes
  exploded into one item each, descriptions empty — had already happened on **08-23**,
  two days earlier. Verified by counting items per packet-day in `pending_beo_imports`:
  3, 3, 1, 7, 3, 8 items for the same Club Car Wash buffet on six consecutive days.
- **Root cause was sampling.** `generationConfig` set only `response_mime_type`, so
  temperature defaulted to **1.0**. Where the layout is ambiguous the model re-decided
  the grouping on every run. Now `temperature: 0`.
- **The layout genuinely is ambiguous, and the prompt described it wrongly.** Confirmed
  by extracting x/y text positions from the real packet: on the Club Car Wash page the
  left column holds a TIME RANGE (`6:15pm-8:30pm`), not a label, and the whole centre
  block — buffet name, rolls, six dishes, `$48/person +25% grat` — is one cell against
  qty 26. The prompt's "label = left-column label" did not describe that page.
- **Three prompt rules added:** one row = one item (a qty-bearing line plus every centre
  line beneath it); `label` is always the left-column row-TYPE word (`Buffet`,
  `Services`, `A La Carte Ordering`, `Custom Buffets`…) and never a dish name; a qty is
  never copied onto the lines beneath the row that carries it.
- **A contradiction I introduced was caught by the verification run**, not by review:
  "an item runs until the next qty" versus "if the left cell is a time range, reuse the
  nearest label" — the second implies a time-range row starts a new item, so the buffet
  split again and one run copied `qty=26` onto all seven dishes, which would have
  ordered seven times the food. Fixed by stating that a time range or blank left cell
  never starts a new item.
- **Label carry-forward done in CODE, not the prompt.** The BEO prints the label cell
  once and leaves it blank on rows beneath that carry their own qty (The Eliminator's
  buffet: `Custom Buffets` against Chicken Caprese, then five dishes at qty 50 with an
  empty cell). 30 of 68 items came back with a blank label. Now carried forward within
  the category, falling back to the category name — which is what the left column prints
  in the one category (of 39) that has no leading label.
- **Verification — the test that should have existed already:** the same packet parsed
  twice through the deployed function, item structure fingerprinted and diffed. v18: 63
  vs 69 items, every row different. v19: 74 vs 69, 60 rows matching. v21: **identical
  fingerprint `2d7e6069b527`, 68 items, 0 blank labels, 0 items without qty, 0 empty
  descriptions.** Club Car Wash's buffet is one item at qty 26 with the full dish list.
- **Open:** `$30/Person` still comes through as an item where the BEO prints it as a
  real row with its own qty — faithful to the document, but junk in a food order list.
  Filtering belongs downstream, not in the parser. Rows approved from the 08-25 packet
  still hold the bad structure until re-approved or overwritten by the next packet.

---

### 2026-08-29 — Parse Churn Returned; Geometric Parser Prototype

**File(s) Changed:** `prototypes/` (new: `beoGeometricParser.mjs`, `auditParser.mjs`,
`README.md`) — `process-beo` unchanged, still v21
**Type:** `feature` (prototype, not wired in)
**Summary:** The 08-25 determinism fix did not hold. Correcting that, then building a
parser that reads the table from the PDF's own coordinates instead of inferring it.

**Details:**

- **Correction to the 08-25 entry.** That entry reported the parse verified
  deterministic on an identical fingerprint from two back-to-back runs. The test was
  too weak — it could not distinguish "stable" from "stable within five minutes."
  Same event, same field, consecutive packets under v21: The Eliminator returned **11
  items on 08-26 and 28 items on 08-27**. `temperature: 0` narrowed the swing but did
  not remove it across days.
- **Both renderings were wrong.** Ground truth from the page geometry: Saturday Lunch
  Buffet is 5 rows each at qty 25 (`Burger Bar`/`All The Toppings!` merged, since the
  toppings line carries no qty). 08-26 merged all five into one; 08-27 split them with
  dish names in the label column.
- **Repair of the 08-25 rows:** 8 events pushed back through Mode B (updated in place,
  tasks and crew notes preserved, 0 inserts). Club Car Wash went from 8 buffet rows
  with missing quantities back to 2 correct rows before that night's service. Four
  events could not be repaired — they were absent from the packet I had locally.
- **Prototype: read the geometry, do not infer it.** Columns are fixed (label x<=60,
  centre 60-500 always centred at 322, qty ~538 anchored per page off the `Qty` cell).
  The signal that makes the rest work is **line spacing**: ~11-12pt is a wrapped line
  inside the cell above, ~16-17pt a new table row, ~25-26pt a section header. Neither
  font nor centring separates a category header from a continuation line — both are
  lone centre cells at c=322 in the same font — but the gap does.
- **Validation on 5 packets / 71 events / 264 items:** parsed item count *and* qty sum
  equal the qty-bearing rows counted straight off the coordinates, without using the
  parser, on **71 of 71**. Zero blank labels, blank descriptions, missing quantities or
  missing dates. Where it disagrees with the LLM (MU Golf Fundraiser, 17 vs 15 items)
  the parser is right — the LLM dropped two qty rows.
- **Edge-runtime test passed.** `unpdf` under Deno gives byte-identical output to
  Node/pdfjs (same SHA on all 5 packets, `diff` reports zero lines). Deployed as a
  throwaway `beo-geom-test` function: all 5 packets returned hashes matching local, at
  **210-640ms against roughly 90 seconds for the Gemini parse**. Largest packet (685KB)
  run 4× consecutively — identical hash each time. Garbage input fails cleanly.
- **Found while testing:** one packet carries two BEOs with the *same event name*
  (`State Farm/#4163-1` 07/30 and `#4164-1` 07/31). Keying on the footer's BEO number
  separates them; name alone merges them. No name+date collision occurs in these 5
  packets so production's dedup key survives, but `beo_number` is the stronger key.
- **Not measured:** memory in the hosted runtime — `Deno.memoryUsage().rss` returns 0
  inside the Supabase sandbox. Nothing OOM'd across 9 invocations; that is absence of
  failure, not a number.
- **Open:** prototype is not wired in. `beo-geom-test` is deployed and inert — delete
  from the dashboard (MCP can deploy but not delete). The 3 BEO packets added to
  `app/sample-data/test_beos/` are untracked and carry member PII, as does the
  `process-beo upload diff/` screenshot folder.

---

### 2026-08-30 — Geometric Parser Wired Into process-beo

**File(s) Changed:** `supabase/functions/process-beo/index.ts`,
`supabase/functions/process-beo/beoGeometricParser.ts` (new) — **v21 → v22**
**Type:** `feature`
**Summary:** The BEO table is now read from the PDF's own coordinates instead of being
inferred by Gemini. Gemini is kept as a fallback, taken only when the geometric result
fails to reconcile.

**Details:**

- **Geometric first, model second — not a blend.** `parseGeometric()` runs on every
  upload. Its result is accepted ONLY if it reconciles against an independent count of
  qty-bearing rows taken straight from the coordinates. If it does not, or if it throws,
  or if no BEO footer is found, the request falls through to the existing Gemini path.
  An unfamiliar layout therefore degrades to the old behaviour rather than silently
  writing a wrong order list.
- **The reconciliation counter shares no logic with the assembler** — that is what makes
  it a real check rather than a restatement.
- **Caught a wrong assumption while building.** Scoping that counter to pages carrying a
  BEO footer was necessary: `test_beos (46)` is not a daily packet at all but a 92-page
  EVENT CONTRACT with BEO pages embedded at 39-53, 65-69 and 84-87. Counting the contract
  pages reported 40 items against 75 rows and would have pushed a good parse to the model
  every time. The earlier "5 packets, same template" claim was wrong — it is 4 daily
  packets plus one contract bundle.
- **Two real defects fixed while typing the parser:** `getTextContent()` returns
  `TextItem | TextMarkedContent`, and marked-content items have no `.str` — an unguarded
  `.trim()` would have thrown. And `midText(row)` was being called with one argument
  against a two-argument signature; it worked by accident, and now says so.
- **Type-check parity:** `deno check` reports 11 errors both before and after, with
  **zero from the new parser file**. The 11 are the pre-existing `SupabaseClient` generic
  mismatch in `index.ts`.
- **Verification against deployed v22:** all 5 packets returned `engine=geometric` with
  hashes matching the local Deno output exactly, in **397-1010ms** against roughly 90
  seconds for the Gemini path. The fallback branch was exercised separately with an
  invalid PDF: the geometric parse threw, the request reached Gemini, and Gemini
  rejected it — the handoff works.
- **Also now returned:** `engine` on every Mode A response, so which path ran is visible
  in the review queue and the logs rather than having to be inferred.
- **Open:** `prototypes/` still holds the Node version of the parser plus its audit
  harness. It duplicates the shipped TypeScript, but the harness only runs under Node,
  so it was kept for validating future packets. Worth revisiting.
