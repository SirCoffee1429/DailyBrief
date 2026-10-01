# DailyBrief — Project Brief

## What This App Is

DailyBrief is a digital kitchen management web app for Old Hawthorne Country Club in
Mid-Missouri, serving kitchen crew, front of house, and office/management through
separate password-protected dashboards. Live at https://brief-club.vercel.app —
**Supabase project ref `chajwmoohmiugdgvqjyo`**.

Stack, routes, pages, tables and edge functions are derivable from the repo (`package.json`,
`app/src/`, `supabase/functions/`); only the non-obvious bits are recorded below.

---

## App Structure

- `/` — Role select screen (Kitchen or Office)
- `/kitchen/*` — Crew-facing: briefing, tasks, recipes, sales, AI assistant
- `/office/*` — Manager-facing (password: chef21): all kitchen features + briefing
  editor, workbook upload, catalog, menus, category management, history
- `/foh/*` — Front of house-facing: brief, events, recipes, AI assistant (cyan sidebar)

---

## RAG Pipeline (Vector Search)

Kitchen assistant uses RAG, not full-context dumps: recipe upload → chunked →
`embed-chunks` → `workbook_chunks.embedding` (vector(768), ivfflat). A question is
embedded, `match_chunks()` returns the top 15, and only those reach Gemini.

---

## Key Design Decisions

- Office password (`chef21`) hardcoded in `OfficeGate.jsx` — client-side only, no real auth
- Category is `text[]`, with legacy string parsing for older records. Voice = Web Speech
  API (long-press 1.5s the center nav button); weather defaults to Columbia, MO
- Models via `v1beta`: `gemini-embedding-001` (embeddings), `gemini-3-flash-preview`
  (generation, 9 call sites). Both trail Google's GA line, but the owner reviewed this
  2026-09-17 and **chose NOT to upgrade** — the parse is stable. Don't re-propose unasked.
  **Multimodal PDF work is the exception**: `process-beo` and `process-menu` pin
  `gemini-2.5-flash`, measured — 3-flash-preview took 25s on ONE page and blew the 130s
  gateway margin on four. Time a new PDF path on the LARGEST file; 1 page hides it
- Recipes are a FIXED Excel template in `workbook_sheets.rows` (row 1 `RECIPE:`|name, rows
  3–23 ingredients, row 24 `Assembly:`). **NO yield field** — 494 sheets, 0 say "serves":
  an absolute batch that CANNOT scale to a headcount
- Dates: `lib/dates.js` for local "today", never `toISOString().split()` (UTC flips 7pm Central).
  Schedule `week_start` is a MONDAY; the grid matches shifts by exact date — re-date BOTH
- Briefings: `briefings.date` is the day it SHOWS; same-day posts stack. `defaultBriefingDate()`
  picks today before 5pm local, tomorrow after (posts are written after dinner service)
- Catalog (`supplier_products`): highest-price-wins is per upload BATCH (across uploads, a
  ratchet). `case_price` derives at INGEST (219 catch-weight; read-time math prints ~50x low).
  `category` seeds via an RPC filling only NULLs. `last_purchased_on` loads from PFG's purchase
  worksheet — NEVER its prices (catch-weight shows the per-lb price, unmarked)
- Menus (`menu_dishes`, P2): hand-designed marketing layouts, so a MODEL reads them, not
  coordinates. `.docx` converts to HTML **in the browser** (Gemini can't read .docx;
  `npm:mammoth` in the edge fn blew the 130s cold start). Safe only behind the confirm gate
- **`base_price` buys `price_qty` x `price_unit`.** "$85 for 20 pieces" stored as 85/piece
  is 20x too dear and looks normal — it shipped that way on 27 rows. A quantity basis on a
  SECTION HEADING carries down onto each dish; "Starting at" is a group FLOOR, never a
  dish price
- A priced package ("Southern BBQ $41") is ONE dish or its price is lost; a minimum counts
  in the PRICE's unit ("2 dozen" beside $/doz = 2, not 24). v8 invented prices and v9 still
  ignored a rule — check the CONFIRMED rows, never just the confirm count
- A dish name can appear TWICE on one menu at two prices (Breakfast "Yogurt Parfait Bar"
  $10/ea AND +$6 upgrade): identity is `(name, menu_source, menu_section, season)`,
  `nulls not distinct`. A narrower key made the RPC's dedupe silently eat real dishes —
  caught ONLY by its `read` vs `inserted` counters
- `upcharge` conflates an INTRINSIC premium (Chopped Cobb +$5 always) with a POSITIONAL
  surcharge ("Additional Salad +$5" = the 2nd salad, whichever it is; the $38 buffet
  covers 1 salad/2 sides/2 entrees/1 dessert). Rule rows name no food and are flagged
  `is_price_rule` — ingredients on them would DOUBLE-ORDER, since the real dish is its
  own row. P3 must draw from the `orderable_menu_dishes` view. Separating the two kinds
  needs package composition = pricing = out of v1 scope
- FOH shell is the cyan sidebar (`FOHLayout` + `.foh-v2`), or the office orange bleeds in
- `.wb-act-btn` is shared beyond the communication board — scope hover-reveal to
  `.wb-note .wb-act-btn`, never the bare class, or buttons go invisible app-wide
- `receive-beo-email` is deliberately wide open (random-hash Postmark address; the review
  queue protects live events). Do not "harden": forwarding rewrites `From` so an allowlist
  refuses real BEOs, and a secret works only as `https://user:SECRET@host`
- BEOs arrive as a **daily ReserveCloud packet emailed as a LINK, not an attachment**.
  `receive-beo-email` fetches it in two hops: `/web/token/process/<a>/<b>` 303s to a page
  whose single href swaps `view` → `download`. Backgrounded, so the webhook acks ~2s
- `EXCLUDED_EVENT_NAMES` drops recurring club events: WHOLE name, lowercased, apostrophes
  stripped. Do NOT loosen to contains/startsWith — one packet holds `Ladies' League`
  (excluded) beside `Ladies' Night League` and `Ladies Night Out` (kept)
- A BEO's `Event Date(s)` row ALWAYS prints a range (one day reads `08/21 - 08/21`); the
  same-day end date is collapsed to null in CODE — prompt wording never held, since it
  asks Gemini to contradict the page
- **The BEO table is parsed from the PDF's coordinates, not the model** (`process-beo` v26,
  `beoGeometricParser.ts`): columns fixed (label x<=60, centre 60-500, qty ~538), and
  **line spacing is the signal**, not font — ~11pt wrapped, ~17pt row, ~25pt section
- **An item starts on a qty OR a left-column label** (Qty prints once per section, none at
  headcount 0); a centre line with neither opens one, never vanishes (SUMMARY take-out pages)
- **Page 2+ of a BEO CONTINUES its table with no section header** — state carries across an
  event's pages; only a page reprinting `Event Headcount`/`Start Date` restarts it
- **The gate is a CONSERVATION check — never "restore" the old counter.** Each printed line
  must be CONSUMED once per event (counted: mere presence let a repeated `per dozen` vouch
  for a lost one). It passed broken parses twice by sharing the parser's premise — **share
  no premise, not just no code** — so measure it by deleting output, not by clean passes
- A stuck emailed BEO is swept by `sweepStuckBeoImports()` (`lib/usePendingBeoImports.js`)
  via `useOfficeApprovalCounts` — not `pg_cron`, since it only matters once a human opens
  the app
- **New `public` tables get RLS switched on automatically** (event trigger `ensure_rls`, not
  in the repo) — create the policy in the same migration or the app reads nothing. Views
  are `security_invoker`; CREATE OR REPLACE resets that unless its WITH clause repeats it.
  Migrations CANNOT rebuild prod (3 of 54 match) — never `db push`/`db reset`; the full
  structure is `supabase/schema_baseline.sql` (09-28 dump; header says how to regenerate)

---

## Future Plans

- Universal DailyBrief (separate repo/org) for any restaurant or club — universal
  ingestion: PDF, DOCX, CSV, plain text alongside XLSX
- KitchSync (scheduling) + PrepMaster (inventory) once DailyBrief has paying customers
- Real auth to replace the hardcoded office password
- Supplier order guide in BEO order lists — **P1 SHIPPED** (`/office/catalog`, 1,381
  products). **P2 DONE: 15 current menus, 368 dishes CONFIRMED** (2026-09-26,
  `process-menu` v9; 4 price rules, 364 orderable). P0 cancelled. **P3 IN PROGRESS** (10-01:
  42/364 dishes specced, 14 confirmed; 116/122 ingredient→product matches confirmed); reads
  only `orderable_menu_dishes`; inference stays OUT of the per-BEO path. Phasing:
  `claudedocs/design_beo_order_guide_2026-09-15.md`

---

## Branches

- **`main`** — primary workspace and Vercel's production branch. Non-scheduler work here.
- **`auto-scheduler`** — slow-moving side feature (BOH schedule generator), worked in
  bursts. **Local only, never pushed**, deliberately. Prod `generate-schedule` v17 (`7dfe506`)
  stays deployed as is (owner, 09-28) — deploy nothing newer unasked. Never merge or push
  unasked. Merge `main` INTO it at the start of a scheduler session.

---

## Global Rule Overrides

The global `~/.claude/rules/` files assume conventions this repo does not follow.
For DailyBrief, the rules below win:

- **Testing:** no test runner on `main` — the gate is `npm run build` plus browser
  verification; no 80%-coverage/E2E demands (a framework is the owner's call). Deno tests: `process-menu/prompt_test.ts` on main, the solver suite on `auto-scheduler`.
- **Agents:** never spawn sub-agents automatically — the developer orchestrates; use one
  only when asked. The global agents table names agents that are NOT installed.
- **Toolset:** SuperClaude (`/sc:*`, the 20 agents in `~/.claude/agents/`, this repo's
  `feature-prioritizer`). The `everything-claude-code` bundle is disabled in
  `.claude/settings.local.json`; prefer the SuperClaude equivalent.
- **Commits:** no `Co-Authored-By` trailer — no commit in this repo has one.
- **Codex is advisory only.** `AGENTS.md`, `.codex/`, `.agents/skills/` (untracked) are
  Codex's; `AGENTS.md`'s "make no changes" rule is for Codex and does NOT apply here, and
  its `~/.Codex/...` paths are really `~/.claude/...`.

---

## Change Tracking & Session Init

- All changes are logged at `CHANGES.md`; at the start of every session (or whenever a
  new model is loaded) you MUST read all files in `.agents
ules`

## Your Behavior

1. Its ok to not know something or to be wrong but always let me know. Do not
   guess or put out wrong information or code just to "complete" a task to make
   me happy.
2. Ask me clarifying questions to get a better understanding of my request
   before you start working on it.
3. Dont start building or working on a new feature until you are 95% confident
   that you understand my request and that you have a good plan for how to
   implement it.
4. Offer suggestions if you think of a better idea or that something might work
   better based on the project and goals.
5. Always use the tools and functions available to you to get the most accurate
   information possible. Do not rely on assumptions.
6. Double check your work and make sure it is correct before you present it to
   me.
7. Refactor code when needed to make it more efficient or readable.
8. delete dead code when you see it.
9. Think outside the box and come up with creative solutions to problems.
10. Always put explanations for your code using // above each function or block
    of code.
11. Never cut corners just for the sake of saving time, tokens, or to get
    something "working" just for the sake of pleasing me.
12. Never store JWT locally.
13. Use the tools, commands, agents, loops, scripts, plugins etc. from the C:\Old Hawthorne Projects\DailyBrief\SuperClaude_Framework folder

## Session End

Ill trigger the end of the session by running /sc:save command. At that point you will follow the /sc:save command instructions as well as  :

1. Update "CHANGES.md" with a summary of what we worked on and the progress we
   made. Make sure to save the changes and exit the session. Keep under 500 lines —
   to make room, **MOVE** the oldest detailed entries to `docs/changelog/YYYY-MM.md`
   and leave a substantive one-liner + `→ [full]` link. **Never delete an entry.**
2. Update this file with any changes or new information that we learned and is
   relevant to the project. Make sure to conslidate this file so that it never
   exceeds 200 lines
3. Update MEMORY.md with what you have learned or discovered during the session. 
4. Exit
