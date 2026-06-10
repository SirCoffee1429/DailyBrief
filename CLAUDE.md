# DailyBrief — Project Brief

## What This App Is

DailyBrief is a digital kitchen management web app built for Old Hawthorne
Country Club in Mid-Missouri. It serves three audiences — kitchen crew, front of
house, and office/management — through role-based dashboards (office is password
protected).

The app is live at: https://brief-club.vercel.app

---

## Tech Stack

- **Frontend:** React 19 + Vite 6, React Router v7 (`react-router-dom`)
- **Backend:** Supabase (Postgres + Deno Edge Functions + Storage)
- **AI:** Google Gemini (`gemini-3-flash-preview` default; `gemini-3.1-pro-preview`
  for complex reasoning like prep-task/BEO inference) + `gemini-embedding-001`
  for RAG vector search — all via the `v1beta` endpoint
- **Weather:** Google Weather API
- **File parsing:** `pdfjs-dist` (PDFs), `xlsx` (Excel) on the client
- **Email Ingestion:** Postmark (inbound webhook → sales / banquet PDF parsing)
- **Deployment:** Vercel (with `@vercel/analytics` + `@vercel/speed-insights`)
- **Supabase Project Ref:** chajwmoohmiugdgvqjyo

---

## Repository Layout

This is a monorepo. **The web app lives in `app/`, not at the repo root.**

```
/                     repo root
├── app/              Vite + React frontend (run npm commands FROM HERE)
│   ├── src/
│   │   ├── App.jsx        all routes (Routes/Route table)
│   │   ├── main.jsx       React entry (BrowserRouter + Vercel widgets)
│   │   ├── pages/         route-level screens
│   │   ├── components/    shared UI (layouts, widgets, modals)
│   │   ├── lib/           supabase client + hooks/helpers
│   │   ├── index.css / mobile.css
│   ├── public/           static assets
│   ├── sample-data/       example BEOs, sales, schedules for testing parsers
│   ├── vite.config.js     dev server on port 5173
│   └── vercel.json        SPA rewrite → index.html
├── supabase/
│   ├── functions/        Deno edge functions (one folder each)
│   └── migrations/        SQL migrations (timestamped)
├── docs/superpowers/     feature plans + design specs
├── .agents/rules/        session init + change-tracking rules
└── CHANGES.md            running change log (repo root)
```

- **GitHub:** https://github.com/SirCoffee1429/DailyBrief

---

## App Structure & Routing

Routes are defined in `app/src/App.jsx`. Each route wraps a page in its role
layout; office routes are additionally wrapped in `<OfficeGate>`.

- `/` — `RoleSelect` (Kitchen / FOH / Office)
- `/kitchen/*` — Crew: dashboard, recipes (+ create + viewer), AI chat, sales,
  events/banquets, time-off, schedule
- `/foh/*` — Front of house: dashboard, recipes (+ viewer), AI chat, events
- `/office/*` — Manager (password `chef21`): all kitchen features + briefing
  editor, workbook upload/create, history, communication, sales, time-off
  (officeMode), schedule (officeMode)

### Key Pages (`app/src/pages`)

- `Dashboard.jsx` — Kitchen dashboard (briefing, tasks, recipes, sales, weather)
- `FOHDashboard.jsx` — Front of house dashboard
- `OfficeDashboard.jsx` — Office dashboard (stats, tiles, sales)
- `KitchenRecipes.jsx` — Recipe browser with category filter + search
- `RecipeCreator.jsx` — Manual recipe authoring (no Excel upload)
- `WorkbookViewer.jsx` — Read view of a single recipe/workbook (`/recipes/:id`)
- `WorkbookLibrary.jsx` — Office recipe management (upload, edit, delete, categorize)
- `WorkbookUpload.jsx` — Excel upload → AI categorization → chunk embedding
- `AiChat.jsx` — Full-page RAG knowledge-base chat
- `Communication.jsx` — Office management board / internal comms
- `SalesReports.jsx` / `SalesReportDetail.jsx` — Sales date list + top sellers
- `Briefings.jsx` / `BriefingEditor.jsx` — Briefing list + create/edit briefings & tasks
- `History.jsx` — 30-day briefing & task completion log
- `EventsBanquetsPage.jsx` — Banquets & special events with BEO parsing
- `TimeOff.jsx` — Staff time-off requests (`officeMode` prop for manager view)
- `SchedulePage.jsx` — Weekly schedule viewer (`officeMode` for upload/edit)

### Key Components (`app/src/components`)

- `KitchenLayout.jsx` / `FOHLayout.jsx` / `OfficeLayout.jsx` — Shells with bottom tab nav
- `OfficeGate.jsx` — Client-side password gate for office routes
- `AssistantWidget.jsx` — Floating AI assistant with voice input (long-press)
- `WeatherWidget.jsx` — 5-day forecast via Google Weather API
- `SalesBriefing.jsx` / `SalesTrendChart.jsx` / `SalesUploadModal.jsx` — Sales UI
- `ManagementWhiteboard.jsx` — Coordination whiteboard
- `WeeklyFeatures.jsx` / `FeaturesUploadModal.jsx` — Lunch/dinner features
- `ScheduleWidget.jsx` — Schedule summary card
- `EightySixFeed.jsx` — 86'd items feed
- `CategoryManager.jsx` — Recipe category management
- `EditRecipeModal.jsx` / `EditRecipeContentModal.jsx` — Recipe editing modals

### Lib (`app/src/lib`)

- `supabase.js` — Supabase client (reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`,
  falls back to production values)
- `useCategories.js` — Hook for recipe categories
- `useVoiceInput.js` — Web Speech API voice-input hook
- `workbooks.js` — Workbook parsing/upload helpers

---

## Supabase Tables

| Table                  | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `workbooks`            | Uploaded Excel recipe files, category as text[]                                    |
| `workbook_sheets`      | Parsed sheet rows stored as JSON arrays                                            |
| `workbook_chunks`      | Text chunks with vector embeddings for RAG                                         |
| `recipe_categories`    | User-managed category list                                                         |
| `briefings`            | Daily shift notes (title, body, date, destination)                                 |
| `briefing_tasks`       | Tasks attached to briefings with completion + sort order                           |
| `sales_data`           | Parsed nightly sales (item_name, units_sold, category, report_date)                |
| `management_notes`     | Internal management communications and event coordination                          |
| `upcoming_banquets`    | Parsed upcoming event summaries scraped from ReserveCloud links                    |
| `banquet_event_orders` | Structured BEOs detailing event date, food items, and quantities                   |
| `weekly_features`      | Scheduled lunch and dinner features displayed on whiteboard                        |
| `event_tasks`          | Tasks per BEO event; supports subtasks (`parent_id`) + `is_generated` AI flag      |
| `event_order_items`    | Per-event food order list; AI-generated + manual, with ordered checkoff + notes    |
| `time_off_requests`    | Staff time-off requests with date range, time type, and crew name (2/day cap)      |
| `schedules`            | AI-parsed weekly schedules (one row per `week_start`, `schedule_data` jsonb)       |

Storage buckets include `schedules` (public) for uploaded schedule PDFs/images.

---

## Edge Functions (`supabase/functions`)

| Function               | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `kitchen-assistant`    | RAG-powered recipe Q&A using vector similarity search                   |
| `categorize-recipe`    | Classifies uploaded recipe into up to 3 categories                      |
| `embed-chunks`         | Generates vector embeddings for recipe chunks via Gemini                |
| `get-weather`          | Proxies Google Weather API for 5-day forecast                           |
| `process-sales-data`   | Postmark webhook — parses sales PDF via Gemini, inserts into sales_data |
| `process-banquets`     | Postmark webhook — scrapes ReserveCloud PDFs and logs upcoming banquets |
| `process-beo`          | Parses BEO PDFs from dashboard upload and extracts food data            |
| `generate-order-items` | Generates the chef order list from a BEO (skips beverages)             |
| `generate-prep-tasks`  | AI prep-task inference per BEO event (`gemini-3.1-pro-preview`)         |
| `process-features`     | Parses uploaded weekly features (handles docx via fflate unzip)        |
| `process-schedule`     | Parses uploaded weekly schedule (PDF/image) into `schedules`           |

---

## RAG Pipeline (Vector Search)

The kitchen assistant uses RAG instead of dumping all chunks into the prompt:

1. Recipe uploaded → text parsed into chunks → `embed-chunks` called → each
   chunk embedded via `gemini-embedding-001` → stored in
   `workbook_chunks.embedding` (vector(768))
2. Question asked → question embedded → `match_chunks` Postgres function finds
   top 15 similar chunks → only those sent to Gemini
3. Gemini answers from relevant context only

**Postgres function:** `match_chunks(query_embedding vector(768), match_count int)`
**Vector index:** ivfflat on `workbook_chunks.embedding`

---

## Development Workflow

All app commands run from `app/`:

```bash
cd app
npm install          # install deps
npm run dev          # Vite dev server → http://localhost:5173 (auto-opens)
npm run build        # production build → app/dist
npm run preview      # preview the built bundle
```

- **Env:** create `app/.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  Without them, `supabase.js` falls back to production credentials.
- **Edge functions:** deployed to Supabase (project ref `chajwmoohmiugdgvqjyo`).
  Each lives in `supabase/functions/<name>/index.ts` (Deno). Schema changes go in
  `supabase/migrations/` as timestamped SQL files.
- **Deploy:** Vercel builds from `app/` (`vercel.json`); pushes to the connected
  branch trigger deploys. SPA routes are rewritten to `index.html`.
- **No automated test suite or linter** is configured — verify changes manually
  in the dev server.

---

## Key Design Decisions

- Office password (`chef21`) is hardcoded in `OfficeGate.jsx` — client-side only,
  no real auth yet. Never store JWTs locally.
- Category stored as `text[]` in Supabase, with legacy string parsing in
  components for older records
- Voice input uses Web Speech API — long-press (1.5s) on center nav button
  triggers voice mode
- Weather widget defaults to Columbia, MO (38.9517, -92.3341) if geolocation is denied
- Realtime is enabled on several tables (e.g. `schedules`) so dashboards auto-refresh
- RLS policies are intentionally open (`USING (true)`) matching the no-auth model

---

## Future Plans

- Build a universal version of DailyBrief (separate repo/org) that works for any
  restaurant or country club regardless of file type or structure
- Integrate KitchSync (scheduling) and PrepMaster (inventory/prep) after
  DailyBrief validates with paying customers
- Add real authentication to replace the hardcoded office password
- Universal file ingestion: PDF, DOCX, CSV, plain text in addition to XLSX

---

## Change Tracking

The running change log lives at `CHANGES.md` in the repo root. (Legacy local
path on the developer's machine: `C:\Old Hawthorne Projects\DailyBrief\CHANGES.md`.)
Session-init and change-tracking rules live in `.agents/rules/`.

## Session Initialization

At the start of every new session, or whenever a new model is loaded, you MUST
read all files in `.agents/rules/`.

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
6. Double check your work and make sure it is correct before you present it to me.
7. Refactor code when needed to make it more efficient or readable.
8. delete dead code when you see it.
9. Think outside the box and come up with creative solutions to problems.
10. Always put explanations for your code using // above each function or block of code.
11. Never cut corners just for the sake of saving time, tokens, or to get
    something "working" just for the sake of pleasing me.
12. Never store JWT locally.

## Session End

Ill trigger the end of the session by saying "Session Complete" or "Close
Session", or "End Session". At that point you will :

1. Update "CHANGES.md" with a summary of what we worked on and the progress we made.
2. Update this file with any changes or new information that we learned and is
   relevant to the project. Consolidate this file so that it never exceeds 200 lines.
3. Update memory with what you have learned or discovered during the session.
4. Exit
