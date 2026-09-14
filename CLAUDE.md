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

### Three Dashboards

- `/` — Role select screen (Kitchen or Office)
- `/kitchen/*` — Crew-facing: briefing, tasks, recipes, sales, AI assistant
- `/office/*` — Manager-facing (password: chef21): all kitchen features +
  briefing editor, workbook upload, category management, history
- `/foh/*` — Front of house-facing: brief, events, recipes, AI assistant (cyan sidebar)

---

## RAG Pipeline (Vector Search)

Kitchen assistant uses RAG, not full-context dumps:

Recipe upload → chunked → `embed-chunks` (`embedding-001`) → `workbook_chunks.embedding`
(vector(768), ivfflat). A question is embedded, `match_chunks(query_embedding, match_count)`
returns the top 15, and only those reach Gemini.

---

## Key Design Decisions

- Office password (`chef21`) is hardcoded in `OfficeGate.jsx` — client-side
  only, no real auth yet
- Category stored as `text[]` in Supabase, with legacy string parsing for older records
- Voice input uses Web Speech API — long-press (1.5s) the center nav button for voice mode
- Weather widget defaults to Columbia, MO (38.9517, -92.3341) if geolocation is denied
- Models via `v1beta`: `gemini-embedding-001` (embeddings), `gemini-3-flash-preview`
  (generation, 9 call sites). **Both are stale** — Google's GA flash line is at 3.8.
  Upgrade as its OWN change before any new AI feature; it shifts BEO parsing too
- Recipes are a FIXED Excel template, one sheet each, in `workbook_sheets.rows`: row 1
  `RECIPE:`|name, row 2 `Ingredients|Quantity|Measure|Unit Cost|Total Cost`, rows 3–23
  ingredients, row 24 `Assembly:`, rows 25–32 method. **There is NO yield field** — 494
  sheets, 0 say "serves" — so a recipe is an absolute batch with no denominator and
  CANNOT be scaled to a headcount until one is added. 411 carry their own cost columns
- Dates: use `lib/dates.js` for a local "today", never `toISOString().split()`
  — UTC rolls over at 7pm Central and drops the current day from queries
- Briefings: `briefings.date` is the day it SHOWS on the dashboard, not when it was
  written; multiple per day are allowed and all render stacked (newest first, author +
  time byline). `BriefingEditor` defaults the date via `defaultBriefingDate()` — today
  before 5pm local, tomorrow after, because posts are written after dinner service
- FOH shell is the cyan sidebar (`FOHLayout` + the `.foh-v2` class), not the office
  orange — the office shell's hardcoded orange will bleed through otherwise
- `.wb-act-btn` is shared beyond the communication board — scope hover-reveal rules to
  `.wb-note .wb-act-btn`, never the bare class, or action buttons go invisible app-wide
- `receive-beo-email` is deliberately wide open — no secret, no sender/subject filter,
  matching `process-sales-data`; its Postmark address is a random hash and the review
  queue protects live events. Do not "harden" it back: forwarding rewrites `From` to
  `ryan@oldhawthorne.com` (an allowlist refuses real BEOs), and a secret rides the URL
  only as `https://user:SECRET@host` — as `https://SECRET@host` all mail is refused
- BEOs arrive as a **daily ReserveCloud packet emailed as a LINK, not an attachment**
  (their "attach" option will not save). `receive-beo-email` fetches it in two hops:
  `/web/token/process/<a>/<b>` 303s to a page whose single href swaps `view` → `download`;
  no login on either. Attachments still win, so fixing their attach option retires this
  path. The fetch is backgrounded, so the webhook acks in ~2s
- `EXCLUDED_EVENT_NAMES` drops recurring club events (Bridge, Canasta, POPs Golf):
  WHOLE name, lowercased, apostrophes stripped — the parser returns `Ladies League`
  when the glyph fails, `Ladies' League` when it does not. Do NOT loosen to
  contains/startsWith — a packet holds `Ladies' League` (excluded) beside `Ladies' Night
  League` and `Ladies Night Out` (kept). Dropped names land in `excluded_events`
- A BEO's `Event Date(s)` row ALWAYS prints a range — one day reads `08/21 - 08/21`. A
  same-day end date is collapsed to null in code, before the mode split; prompt wording
  never held, since it asks Gemini to contradict the page
- **The BEO table is parsed from the PDF's coordinates, not by the model** (`process-beo`
  v23, `beoGeometricParser.ts`). Columns are fixed (label x<=60, centre 60-500, qty ~538
  off `Qty`) and **line spacing is the signal** — font and centring are NOT: ~11pt =
  wrapped line (labels wrap too), ~17pt = new row, ~25pt = section header
- **A row starts an item on a qty OR a left-column label, never the qty alone** — the BEO
  prints Qty once per section and omits it at headcount 0, so keying on it dropped whole
  menus (Linkside 09/03: three dishes, no qty anywhere). Items may carry `qty: ""`
- **The gate is a CONSERVATION check — never "restore" the old counter.** Every centre
  line printed in a section must survive into the output, indexed PER EVENT (two BEOs
  often print the same menu; the survivor vouches for the lost one). Gemini is the
  fallback when a line vanishes, the parse throws, or no footer is found; `engine` says
  which ran, `dropped` what went missing. The old gate counted qty-bearing rows — the
  assembler's own definition of a row — so it agreed by construction and passed a packet
  that lost three menus: **sharing no code was the wrong safety property; what matters is
  sharing no premise.** Gemini churns day to day even at `temperature: 0` — two identical
  back-to-back runs is NOT a test
- An emailed BEO that dies mid-parse is caught by `sweepStuckBeoImports()`
  (`lib/usePendingBeoImports.js`) via `useOfficeApprovalCounts`, so any office page
  triggers it. Not `pg_cron` — a stuck import only matters once a human opens the app

---

## Future Plans

- Universal DailyBrief (separate repo/org) for any restaurant or club — universal
  ingestion: PDF, DOCX, CSV, plain text alongside XLSX
- KitchSync (scheduling) + PrepMaster (inventory) once DailyBrief has paying customers
- Real auth to replace the hardcoded office password
- Supplier order guide in BEO order lists — spec'd 2026-09-07, NOT built. Inference moves
  OUT of the per-BEO path: define each dish once, confirm, then generation is arithmetic.
  Blocked on volume→weight density. Spec: `claudedocs/requirements_beo_order_guide_2026-09-07.md`

---

## Branches

- **`main`** — the primary day-to-day workspace and Vercel's production branch
  (deploys to brief-club.vercel.app). Non-scheduler work belongs here.
- **`auto-scheduler`** — a slow-moving side feature (BOH weekly schedule
  generator) worked on in occasional bursts. **Local only, never pushed**, and
  deliberately so; its edge function is not deployed. Do not merge or push it
  without the owner asking. It drifts behind `main` between bursts — merge
  `main` into it at the START of a scheduler session, not at ship time.

---

## Global Rule Overrides

The global `~/.claude/rules/` files assume conventions this repo does not
follow. For DailyBrief, the rules below win:

- **Testing:** there is no test runner installed on `main` — the quality gate is
  `npm run build` plus browser verification. Do not demand 80% coverage,
  integration tests, or E2E tests; adding a test framework is the owner's call.
  (The `auto-scheduler` branch does have a real Deno suite for the solver.)
- **Agents:** never spawn sub-agents automatically — the developer orchestrates.
  Use an agent only when explicitly asked. The agents named in the global agents
  table are NOT installed; the available set is SuperClaude's 20 in
  `~/.claude/agents/` plus this repo's own `feature-prioritizer`.
- **Toolset:** SuperClaude is this project's primary command/agent/skill set —
  the `/sc:*` commands in `~/.claude/commands/sc/` and the 20 agents in
  `~/.claude/agents/`. The `everything-claude-code` bundle checked in under
  `.claude/skills` and `.claude/commands` is disabled in
  `.claude/settings.local.json`; prefer the SuperClaude equivalent.
- **Commits:** no `Co-Authored-By` trailer — no commit in this repo has one.
- **Codex is advisory only.** The repo is also connected to Codex/ChatGPT, which
  added `AGENTS.md`, `.codex/`, and `.agents/skills/` (all untracked). `AGENTS.md`
  is a converted copy of this file and ends with "do not make any changes or
  create any files or folders" — deliberate: Codex explains and hands over
  copy-ready code, Claude Code does the editing and deploying. That instruction
  does NOT apply here. Its `~/.Codex/...` paths are a bad find-and-replace and do
  not exist; the real ones are `~/.claude/...`.

---

## Change Tracking & Session Init

- All changes are logged at `C:\Old Hawthorne Projects\DailyBrief\CHANGES.md`
- At the start of every session, or whenever a new model is loaded, you MUST read
  all files in `C:\Old Hawthorne Projects\DailyBrief\.agents\rules`

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
