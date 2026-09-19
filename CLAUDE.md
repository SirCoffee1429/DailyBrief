# DailyBrief — Project Brief

## What This App Is

DailyBrief is a digital kitchen management web app for Old Hawthorne Country Club in
Mid-Missouri, serving kitchen crew, front of house, and office/management through
separate password-protected dashboards. Live at https://brief-club.vercel.app —
**Supabase project ref `chajwmoohmiugdgvqjyo`**.

Stack, dependencies, routes, pages, components, tables, and edge functions are all
derivable from the repo — read `package.json`, `app/src/`, and `supabase/functions/`.
Only the non-obvious bits are recorded below.

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
- Category is `text[]`, with legacy string parsing for older records
- Voice = Web Speech API (long-press 1.5s the center nav button); weather defaults to
  Columbia, MO if geolocation is denied
- Models via `v1beta`: `gemini-embedding-001` (embeddings), `gemini-3-flash-preview`
  (generation, 9 call sites). Both trail Google's GA line, but the owner reviewed this
  2026-09-17 and **chose NOT to upgrade** — the parse is stable. Don't re-propose unasked.
  **Multimodal PDF work is the exception**: `process-beo` and `process-menu` pin
  `gemini-2.5-flash`, measured — 3-flash-preview took 25s on ONE page and blew the 130s
  gateway margin on four. Time a new PDF path on the LARGEST file; 1 page hides it
- Recipes are a FIXED Excel template in `workbook_sheets.rows` (row 1 `RECIPE:`|name, rows
  3–23 ingredients, row 24 `Assembly:`, 25–32 method). **There is NO yield field** — 494
  sheets, 0 say "serves": an absolute batch that CANNOT scale to a headcount
- Dates: use `lib/dates.js` for a local "today", never `toISOString().split()` — UTC rolls
  over at 7pm Central and drops the current day from queries
- Briefings: `briefings.date` is the day it SHOWS, not when written; same-day posts stack
  (newest first, author + time byline). `defaultBriefingDate()` picks today before 5pm
  local and tomorrow after — posts are written after dinner service
- Catalog (`supplier_products`): highest-price-wins is scoped to ONE upload batch — across
  uploads it is a ratchet. `case_price` derives at INGEST (219 catch-weight items; a
  read-time branch gets forgotten and prints ~50x low). `category` seeds via an RPC
  filling only NULLs — a re-upload can't clobber it
- Menus (`menu_dishes`, P2): the 8 catering PDFs are hand-designed marketing layouts, so
  a MODEL reads them, not coordinates — on Breakfast the price column extracts as a
  detached run and only the rendered page says which price is whose. Safe because it
  drafts once behind a human gate; the per-BEO path stays arithmetic
- A dish name can appear TWICE on one menu in two sections at two prices (Breakfast
  "Yogurt Parfait Bar" = $10/ea item AND +$6 buffet upgrade), so identity is
  `(name, menu_source, menu_section, season)`, `nulls not distinct` because season is
  null on six menus. A narrower key made the RPC's dedupe silently eat real dishes —
  caught ONLY by its `read` vs `inserted` counters, never by the UI
- `upcharge` conflates an INTRINSIC premium (Chopped Cobb +$5 always) with a POSITIONAL
  surcharge ("Additional Salad +$5" = the 2nd salad, whichever it is; the $38 buffet
  covers 1 salad/2 sides/2 entrees/1 dessert). Rule rows name no food and are flagged
  `is_price_rule` — ingredients on them would DOUBLE-ORDER, since the real dish is its
  own row. P3 must draw from the `orderable_menu_dishes` view. Separating the two kinds
  needs package composition = pricing = out of v1 scope
- FOH shell is the cyan sidebar (`FOHLayout` + `.foh-v2`) — the office shell's hardcoded
  orange bleeds through otherwise
- `.wb-act-btn` is shared beyond the communication board — scope hover-reveal to
  `.wb-note .wb-act-btn`, never the bare class, or buttons go invisible app-wide
- `receive-beo-email` is deliberately wide open (random-hash Postmark address; the review
  queue protects live events). Do not "harden": forwarding rewrites `From` to
  `ryan@oldhawthorne.com` so an allowlist refuses real BEOs, and a secret works only as
  `https://user:SECRET@host` — as `https://SECRET@host` all mail is refused
- BEOs arrive as a **daily ReserveCloud packet emailed as a LINK, not an attachment**.
  `receive-beo-email` fetches it in two hops: `/web/token/process/<a>/<b>` 303s to a page
  whose single href swaps `view` → `download`, no login on either. Attachments still win,
  so fixing their attach option retires this path. Backgrounded, so the webhook acks ~2s
- `EXCLUDED_EVENT_NAMES` drops recurring club events: WHOLE name, lowercased,
  apostrophes stripped (the parser returns `Ladies League` or `Ladies' League` depending
  on the glyph). Do NOT loosen to contains/startsWith — one packet holds `Ladies' League`
  (excluded) beside `Ladies' Night League` and `Ladies Night Out` (kept)
- A BEO's `Event Date(s)` row ALWAYS prints a range (one day reads `08/21 - 08/21`); a
  same-day end date is collapsed to null in CODE, before the mode split — prompt wording
  never held, since it asks Gemini to contradict the page
- **The BEO table is parsed from the PDF's coordinates, not by the model** (`process-beo`
  v23, `beoGeometricParser.ts`): columns fixed (label x<=60, centre 60-500, qty ~538), and
  **line spacing is the signal**, not font/centring — ~11pt wrapped, ~17pt row, ~25pt section
- **A row starts an item on a qty OR a left-column label, never the qty alone** — the BEO
  prints Qty once per section and omits it at headcount 0, so keying on it dropped whole
  menus (Linkside 09/03: three dishes, no qty anywhere). Items may carry `qty: ""`
- **The gate is a CONSERVATION check — never "restore" the old counter.** Every centre
  line printed must survive into the output, indexed PER EVENT. Gemini is the fallback
  when a line vanishes, the parse throws, or no footer is found (`engine`/`dropped` say
  which and what). The old gate counted qty-bearing rows — the assembler's own definition
  of a row — so it agreed by construction and passed a packet that lost three menus:
  **sharing no code was the wrong safety property; what matters is sharing no premise**
- A stuck emailed BEO is swept by `sweepStuckBeoImports()` (`lib/usePendingBeoImports.js`)
  via `useOfficeApprovalCounts`, so any office page triggers it — not `pg_cron`, because a
  stuck import only matters once a human opens the app

---

## Future Plans

- Universal DailyBrief (separate repo/org) for any restaurant or club — universal
  ingestion: PDF, DOCX, CSV, plain text alongside XLSX
- KitchSync (scheduling) + PrepMaster (inventory) once DailyBrief has paying customers
- Real auth to replace the hardcoded office password
- Supplier order guide in BEO order lists — **P1 + P2 SHIPPED** (`/office/catalog`:
  1,381 products; `/office/menus`: 232 dishes, 124 confirmed). P0 cancelled. **P3 next**:
  `dish_ingredients` + `ingredient_products`. Inference stays OUT of the per-BEO path.
  Phasing: `claudedocs/design_beo_order_guide_2026-09-15.md`

---

## Branches

- **`main`** — primary workspace and Vercel's production branch. Non-scheduler work here.
- **`auto-scheduler`** — slow-moving side feature (BOH schedule generator), worked in
  bursts. **Local only, never pushed**, deliberately; its edge function is not deployed.
  Never merge or push unasked. Merge `main` INTO it at the start of a scheduler session.

---

## Global Rule Overrides

The global `~/.claude/rules/` files assume conventions this repo does not follow.
For DailyBrief, the rules below win:

- **Testing:** there is no test runner installed on `main` — the quality gate is
  `npm run build` plus browser verification. Do not demand 80% coverage,
  integration tests, or E2E tests; adding a test framework is the owner's call.
  (The `auto-scheduler` branch does have a real Deno suite for the solver.)
- **Agents:** never spawn sub-agents automatically — the developer orchestrates; use one
  only when asked. The global agents table names agents that are NOT installed.
- **Toolset:** SuperClaude is the primary command/agent/skill set — `/sc:*` in
  `~/.claude/commands/sc/` plus the 20 agents in `~/.claude/agents/` and this repo's
  `feature-prioritizer`. The `everything-claude-code` bundle under `.claude/` is disabled
  in `.claude/settings.local.json`; prefer the SuperClaude equivalent.
- **Commits:** no `Co-Authored-By` trailer — no commit in this repo has one.
- **Codex is advisory only.** Codex/ChatGPT added `AGENTS.md`, `.codex/`, `.agents/skills/`
  (all untracked). `AGENTS.md` is a converted copy of this file ending "do not make any
  changes or create any files or folders" — deliberate (Codex explains, Claude Code edits
  and deploys), and it does NOT apply here. Its `~/.Codex/...` paths don't exist; the real
  ones are `~/.claude/...`.

---

## Change Tracking & Session Init

- All changes are logged at `CHANGES.md`; at the start of every session (or whenever a
  new model is loaded) you MUST read all files in `.agentsules`

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
