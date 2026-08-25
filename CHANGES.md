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

---

## Detailed Entries

### 2026-08-16 — Emailed BEO Ingestion: Postmark → Review Queue → Approve

**File(s) Changed:** `supabase/functions/receive-beo-email/index.ts` (new, v5 deployed),
`supabase/functions/process-beo/index.ts` (Mode C), `supabase/config.toml`,
migrations `create_pending_beo_imports` + `add_beo_notification_kinds`,
`app/src/lib/beoDiff.js` (new), `app/src/lib/usePendingBeoImports.js` (new),
`app/src/components/PendingBeoPanel.jsx` (new), `app/src/pages/EventsBanquetsPage.jsx`,
`app/src/lib/useOfficeApprovalCounts.js`, `app/src/components/OfficeLayout.jsx`,
`app/src/lib/notifications.js`, `app/src/components/NotificationBell.jsx`, `app/src/index.css`
**Type:** `feature`
**Commits:** `a60f440`, `61a5f2e`, `60ac183`, `2fe81eb` — all pushed
**Summary:** BEOs emailed by Rhi now arrive in DailyBrief automatically instead of being
downloaded and re-uploaded by hand. They are never applied silently: each email becomes a
reviewable card above the BEO list on `/office/events` showing a diff against the live event,
with Approve and Discard. Proven end to end in production — a real forwarded BEO updated
Meadley Pool Party from 50 to 150 guests.

**Details:**

- **Pipeline:** Outlook redirect rule → Postmark inbound (the dormant `process-banquets`
  server, reused; verified dormant against the data, not assumed) → `receive-beo-email` →
  row in `pending_beo_imports` as `processing` → PDF stored in the private `beo-emails`
  bucket → 200 returned immediately → Gemini parse under `EdgeRuntime.waitUntil` → row
  becomes `pending` with `parsed_events`, or `parse_failed` with `error_text`. Bell
  notification on both paths.
- **No prompt duplication:** `process-beo` gained a `parseOnly` early return (Mode C)
  returning the same shape Mode B accepts, so the 50-line Gemini prompt has one home and
  Approve is a replay rather than a second parse.
- **Approve applies the whole email.** A packet carries up to a dozen events; Mode B updates
  in place, so re-applying an unchanged event costs nothing. The panel shows only what
  differs and collapses the rest behind a count.
- **Overlap is flagged, not auto-resolved.** The plan called for a newer email to supersede
  an older one naming the same event; that assumed one event per email. With multi-event
  packets the older can carry an event the newer lacks, so both are kept and the overlap is
  warned about in whichever direction it runs.
- **Auth reversed mid-build — the main lesson.** The endpoint originally required an HTTP
  Basic secret and gated on a sender allowlist plus a subject keyword. All three were
  removed. The secret could only reach the endpoint inside the URL as
  `https://user:SECRET@host`; written naturally as `https://SECRET@host` it lands in the
  username half with an empty password, and every message was refused — a full debugging
  cycle lost to a URL format. The allowlist would have refused the first real BEO outright,
  because forwarding rewrote `From` to `ryan@oldhawthorne.com`. The inbound address is a
  random hash only one person sends to, so the gates were checking a property of mail that
  was already ours. What actually protects live event data is the review queue. Setup is now
  a plain URL and one mail rule, matching `process-sales-data`. `secretMatches` remains and
  returns `true` when `BEO_WEBHOOK_SECRET` is unset, so it can be switched back on.
- **Stuck-parse sweep:** a worker killed mid-parse leaves its row at `processing` with
  nothing running to correct it — uncounted, unnotified, and reading as still working.
  `sweepStuckBeoImports()` retires anything over 10 minutes to `parse_failed` and writes the
  bell notification. Runs from `useOfficeApprovalCounts` (mounted by `OfficeLayout`, so every
  office page triggers it) rather than `pg_cron`; the `.select()` zero-rows check doubles as
  the multi-manager concurrency guard.
- **Verification:** all refusal gates by curl; duplicate `MessageID` acked with no second row;
  a real BEO through to `pending` in 86s and a second in 31s; a non-BEO PDF to `parse_failed`
  in 17s; signed-URL retrieval byte-identical with unsigned access refused; the panel
  rendering field/added/removed/quantity diffs against a planted match; the sweep firing from
  the office dashboard. Phase 0 recon was retired unrun — its only question died with the
  allowlist.
- **Leftovers:** two `manual-test-*.pdf` files to delete from the `beo-emails` bucket.

---

### 2026-08-18 — Kitchen Assistant Sales Path: Broken Since April, Now Exact

**File(s) Changed:** `supabase/functions/kitchen-assistant/index.ts`
(deployed v34 → v39)
**Type:** `fix`
**Summary:** Every sales question to the assistant returned "Sorry, I couldn't
complete the calculation." Root cause was a column renamed four months ago.
Fixing it exposed three further defects, each of which produced confidently
wrong numbers rather than errors.

**Details:**

- **Root cause: `total_revenue` does not exist.** PR #6 (2026-04-09) shipped the
  sales path reading `total_revenue`. Two days later `a201c19` replaced that
  column with `total_net_sales` / `net_sales` and the assistant was never
  updated. PostgREST rejected every query with 400 `column sales_data.total_revenue
  does not exist`. **The sales assistant had been dead since 2026-04-11.**
- **The error was destructured and never checked.** `const { data, error } = ...`
  with no `if (error)`, so a hard 400 became `data: null` → "No data found for
  this range." Same silent-failure shape as the `time_off_requests` RLS no-op on
  2026-08-06. Now returns an explicit message instead of inventing an empty set.
- **Repo/prod drift reconciled.** Deployed v34 was an agentic tool-calling rewrite
  that existed nowhere in git; the repo still held PR #6's keyword/aggregate
  version. Owner chose to keep the agentic design — it is now committed, so git
  and prod match.
- **Single tool round → bounded loop (`MAX_TOOL_ROUNDS = 4`).** When a requested
  day has no rows, Gemini asks again with a wider range. The old code had nowhere
  to put that second call, so the follow-up response was a `functionCall`, not
  text, and fell through to the error string. Also switched `parts[0]` to a search
  across parts — a thinking model puts reasoning in `parts[0]`.
- **PostgREST 1000-row cap — the worst of the four.** A month-wide query returned
  `Content-Range: 0-999/1947`: only the 13 most recent of 25 days, silently. Totals
  built from that slice were reported as the full month, understating by ~50%.
  `fetchAllSales()` now pages until a short page arrives.
- **Arithmetic moved out of the model.** Asked to total ~100 rows/day by hand,
  Gemini was consistently wrong (a week came back 1,718.00 light) while unit counts
  were exact. `summariseSales()` computes totals by day, category and item in code
  and marks them authoritative; raw rows are dropped above `RAW_ROW_LIMIT = 1200`.
- `maxOutputTokens` 2048 → 8192 (sales path only) — answers were truncating
  mid-sentence because the budget covers thinking across every tool round.
- **Left alone deliberately:** the `toISOString()` "Today is" line. Flagged as a
  UTC rollover, owner kept it.
- **Verification:** `npm run build` clean (4.78s). All four originally-failing
  questions answered against production, then every figure cross-checked by SQL:
  July 58,993.50 / 7,360 units / 25 days and August-to-18 35,526.00 / 4,163 / 15
  all matched exactly, as did the top-3 July categories and Aug 16's
  3,704.50 / 425 units / 36 handhelds. "Last Friday" (2026-08-14, a genuine data
  gap) now says the report was not uploaded instead of reporting zero. Recipe RAG
  path re-checked, unchanged.
- **Note:** CHANGES.md is now ~505 lines, past the 500-line cap — condense the
  oldest detailed entries into the Archive next session.

---

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
