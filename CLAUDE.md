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

1. Recipe upload → chunked → `embed-chunks` embeds each via `embedding-001` →
   stored in `workbook_chunks.embedding` (vector(768))
2. Question embedded → `match_chunks(query_embedding vector(768), match_count int)`
   Postgres fn returns top 15 similar chunks → only those sent to Gemini
3. Gemini answers from relevant context only. Vector index: ivfflat on
   `workbook_chunks.embedding`

---

## Key Design Decisions

- Office password (`chef21`) is hardcoded in `OfficeGate.jsx` — client-side
  only, no real auth yet
- Category stored as `text[]` in Supabase, with legacy string parsing in
  components for older records
- Voice input uses Web Speech API — long-press (1.5s) on center nav button
  triggers voice mode
- Weather widget defaults to Columbia, MO (38.9517, -92.3341) if geolocation is
  denied
- Embedding model: `embedding-001` via `v1beta` endpoint
- Generation model: `gemini-3-flash-preview` via `v1beta` endpoint
- Dates: use `lib/dates.js` for a local "today", never `toISOString().split()`
  — UTC rolls over at 7pm Central and drops the current day from queries
- Briefings: `briefings.date` is the day it SHOWS on the dashboard, not when it
  was written; multiple per day are allowed and all render stacked (newest
  first, author + time byline). `BriefingEditor` defaults the date via
  `defaultBriefingDate()` — today before 5pm local, tomorrow after, because
  posts are written after dinner service
- FOH shell is the cyan sidebar (`FOHLayout` + the `.foh-v2` class), not the
  office orange — the office shell's hardcoded orange will bleed through
  otherwise
- `.wb-act-btn` is shared beyond the communication board — scope hover-reveal
  rules to `.wb-note .wb-act-btn`, never the bare class, or action buttons go
  invisible app-wide

---

## Future Plans

- Build a universal version of DailyBrief (separate repo/org) that works for any
  restaurant or country club regardless of file type or structure
- Integrate KitchSync (scheduling) and PrepMaster (inventory/prep) after
  DailyBrief validates with paying customers
- Add real authentication to replace the hardcoded office password
- Universal file ingestion: PDF, DOCX, CSV, plain text in addition to XLSX

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
