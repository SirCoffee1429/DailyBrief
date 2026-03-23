# DailyBrief — Project Brief

## What This App Is

DailyBrief is a digital kitchen management web app built for Old Hawthorne
Country Club in Mid-Missouri. It serves two types of users — kitchen crew and
office/management — through separate password-protected dashboards.

The app is live at: https://brief-club.vercel.app

---

## Tech Stack

- **Frontend:** React 19 + Vite, React Router v7
- **Backend:** Supabase (Postgres + Edge Functions + Storage)
- **AI:** Google Gemini Flash (chat + categorization + sales parsing), Google
  embedding-001 (RAG vector search)
- **Weather:** Google Weather API
- **Email Ingestion:** Postmark (inbound webhook → sales PDF parsing)
- **Deployment:** Vercel
- **Supabase Project Ref:** chajwmoohmiugdgvqjyo

---

## Repository

- **DailyBrief:** https://github.com/SirCoffee1429/DailyBrief

---

## App Structure

### Two Dashboards

- `/` — Role select screen (Kitchen or Office)
- `/kitchen/*` — Crew-facing: briefing, tasks, recipes, sales, AI assistant
- `/office/*` — Manager-facing (password: chef21): all kitchen features +
  briefing editor, workbook upload, category management, history

### Key Pages

- `Dashboard.jsx` — Kitchen dashboard (briefing, tasks, recipes count, sales,
  weather)
- `OfficeDashboard.jsx` — Office dashboard (stats, tiles, sales)
- `KitchenRecipes.jsx` — Recipe browser with category filter and search
- `WorkbookLibrary.jsx` — Office recipe management (upload, edit, delete,
  categorize)
- `WorkbookUpload.jsx` — Excel file upload with AI categorization + chunk
  embedding
- `AiChat.jsx` — Full page AI knowledge base chat
- `SalesReports.jsx` — Sales report date list
- `SalesReportDetail.jsx` — Top sellers for a specific date
- `Briefings.jsx` — Office briefing list
- `BriefingEditor.jsx` — Create/edit briefings and tasks
- `History.jsx` — 30-day briefing and task completion log

### Key Components

- `AssistantWidget.jsx` — Floating AI assistant with voice input (long-press for
  voice)
- `WeatherWidget.jsx` — 5-day forecast via Google Weather API
- `SalesBriefing.jsx` — Sales summary card on dashboard
- `KitchenLayout.jsx` / `OfficeLayout.jsx` — Shell with bottom tab nav
- `OfficeGate.jsx` — Password gate for office routes

---

## Supabase Tables

| Table               | Purpose                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `workbooks`         | Uploaded Excel recipe files, category as text[]                     |
| `workbook_sheets`   | Parsed sheet rows stored as JSON arrays                             |
| `workbook_chunks`   | Text chunks with vector embeddings for RAG                          |
| `recipe_categories` | User-managed category list                                          |
| `briefings`         | Daily shift notes (title, body, date)                               |
| `briefing_tasks`    | Tasks attached to briefings with completion + sort order            |
| `sales_data`        | Parsed nightly sales (item_name, units_sold, category, report_date) |

---

## Edge Functions

| Function             | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `kitchen-assistant`  | RAG-powered recipe Q&A using vector similarity search                   |
| `categorize-recipe`  | Classifies uploaded recipe into up to 3 categories                      |
| `embed-chunks`       | Generates vector embeddings for recipe chunks via Gemini                |
| `get-weather`        | Proxies Google Weather API for 5-day forecast                           |
| `process-sales-data` | Postmark webhook — parses sales PDF via Gemini, inserts into sales_data |

---

## RAG Pipeline (Vector Search)

The kitchen assistant uses RAG instead of dumping all chunks into the prompt:

1. Recipe uploaded → text parsed into chunks → `embed-chunks` called → each
   chunk embedded via `embedding-001` → stored in `workbook_chunks.embedding`
   (vector(768))
2. Question asked → question embedded → `match_chunks` Postgres function finds
   top 15 similar chunks → only those sent to Gemini
3. Gemini answers from relevant context only

**Postgres function:**
`match_chunks(query_embedding vector(768), match_count int)` **Vector index:**
ivfflat on `workbook_chunks.embedding`

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

All changes are logged at:
`C:\Old Hawthorne Projects\DailyBrief\.claude\changes_made\CHANGES.md`

## Session Initialization

At the start of every new session, or whenever a new model is loaded, you MUST:

1. Read `CHANGES.md` for project history
2. Read this file for project context
3. Summarize the last 3 tasks completed and current status
4. Output: "Context loaded. Ready to continue from [LAST TASK TITLE]." before
   doing any work

If either file does not exist, flag it immediately before proceeding.
