# DailyBrief — Project Brief

## What This App Is

DailyBrief is a digital kitchen management web app built for Old Hawthorne
Country Club in Mid-Missouri. It serves two types of users — kitchen crew and
office/management — through separate password-protected dashboards.

The app is live at: https://brief-club.vercel.app

---

## Key IDs

- **Supabase Project Ref:** chajwmoohmiugdgvqjyo

Stack, dependencies, routes, pages, components, tables, and edge functions are
all derivable from the repo — read `package.json`, `app/src/`, and
`supabase/functions/`. Only the non-obvious bits are recorded below.

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
- Embedding model: `embedding-001` via `v1beta` endpoint
- Generation model: `gemini-3-flash-preview` via `v1beta` endpoint
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
  often print the same menu; pooling lets the survivor vouch for the lost one). Gemini is
  the fallback when a line vanishes, the parse throws, or no footer is found; `engine`
  says which ran, `dropped` names what went missing. The old gate counted qty-bearing rows
  — the assembler's own definition of a row — so it agreed by construction and passed a
  packet that had lost three menus: **sharing no code was the wrong safety property; what
  matters is sharing no premise.** Gemini churns across days even at `temperature: 0`, so
  two identical back-to-back runs is NOT a test
- An emailed BEO that dies mid-parse is caught by `sweepStuckBeoImports()`
  (`lib/usePendingBeoImports.js`) via `useOfficeApprovalCounts`, so any office page
  triggers it. Not `pg_cron` — a stuck import only matters once a human opens the app

---

## Future Plans

- Universal DailyBrief (separate repo/org) for any restaurant or club, any file type
- KitchSync (scheduling) + PrepMaster (inventory) once DailyBrief has paying customers
- Real auth to replace the hardcoded office password
- Universal ingestion: PDF, DOCX, CSV, plain text alongside XLSX

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

## Change Tracking

All changes are logged at: `C:\Old Hawthorne Projects\DailyBrief\CHANGES.md`

## Session Initialization

At the start of every new session, or whenever a new model is loaded, you MUST:

1. Read all files in C:\Old Hawthorne Projects\DailyBrief\.agents\rules

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
   made. Make sure to save the changes and exit the session. Keep under 500 lines. 
2. Update this file with any changes or new information that we learned and is
   relevant to the project. Make sure to conslidate this file so that it never
   exceeds 200 lines
3. Update MEMORY.md with what you have learned or discovered during the session. 
4. Exit
