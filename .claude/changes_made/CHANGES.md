# DailyBrief — Change Log

---

### 2026-03-19 — Fix Embedding API 404 Errors

**File(s) Changed:** pp/src/pages/SalesReportDetail.jsx **Type:** eature
**Summary:** Fixed 404 errors when calling Google's embedding API. The
`text-embedding-004` model was deprecated and shut down (Jan 2026).

**Details:**

- Switched embedding model from `text-embedding-004` to `gemini-embedding-001`
- Changed API version from `/v1/` to `/v1beta/`
- Added `outputDimensionality: 768` parameter to match existing vector column
  size
- Both edge functions redeployed to Supabase

---

### 2026-03-19 — Move Briefing Cycler to Morning Notes Card

**File(s) Changed:** pp/src/pages/SalesReportDetail.jsx **Type:** eature
**Summary:** Moved the briefing cycler from the header into the morning notes
card for better visibility, and removed the "Morning Notes" heading.

**Details:**

- Removed briefing cycler from the dashboard header
- Placed it at the top of the `morning-notes-card` component
- Added dedicated CSS classes (`.briefing-cycler`, `.briefing-cycler-btn`,
  `.briefing-cycler-label`)
- Orange gradient background with layer-group icon and clear "Briefing X of Y"
  label
- Removed the "Morning Notes" `card-header-row`

---

### 2026-03-19 — Restructure Office Dashboard

**File(s) Changed:** pp/src/pages/SalesReportDetail.jsx **Type:** eature
**Summary:** Removed the Ask Assistant card, kept forecast at top, and arranged
remaining tiles evenly.

**Details:**

- Removed `AssistantWidget` import and Ask Assistant tile
- Weather forecast spans full width at top via `.office-weather-row`
- Briefings, Workbooks, Task History in a 2x2 grid
- SalesBriefing component kept inline spanning full width at the bottom

---

### 2026-03-19 — Management Whiteboard Feature

**File(s) Changed:** pp/src/pages/SalesReportDetail.jsx **Type:** eature
**Summary:** Added a management-only whiteboard on the Office Dashboard for
internal communication.

**Details:**

- Created `management_notes` table in Supabase with columns: id, content,
  author, pinned, created_at
- RLS policy allows all operations (protected by password gate at application
  level)
- Built `ManagementWhiteboard.jsx` component with post, pin/unpin, delete, and
  relative timestamps
- Blue-tinted accent theme to differentiate from orange kitchen UI
- Ctrl+Enter shortcut to post quickly
- Pin/delete action buttons appear on hover
- Integrated below weather forecast in OfficeDashboard.jsx

---

### 2026-03-19 — Move Management Board to Dedicated Page

**File(s) Changed:** pp/src/pages/SalesReportDetail.jsx **Type:** eature
**Summary:** Moved the Management Board from an inline widget to its own page at
`/office/board`.

**Details:**

- Created `ManagementBoardPage.jsx` as a page wrapper with header and back
  button
- Replaced inline `<ManagementWhiteboard />` on the dashboard with a Link tile
  card
- Tile shows note count, blue chalkboard icon, and links to `/office/board`
- Added route in `App.jsx` wrapped in `OfficeGate` + `OfficeLayout`
- Added blue hover accent for the board tile

---

### 2026-03-20 — Redesign Management Board (Column Layout)

**File(s) Changed:** pp/src/pages/SalesReportDetail.jsx **Type:** eature
**Summary:** Redesigned the Management Board to match the Stitch whiteboard
reference — 4-column layout with categorized content.

**Details:**

- Added `category` column to `management_notes` table (alerts, events, comms,
  features)
- Rebuilt ManagementWhiteboard as a 4-column layout:
  - 86'd Items & Alerts (red accent)
  - Special Events & Catering (blue accent)
  - Department Communication (green accent)
  - Lunch/Dinner Features (orange accent)
- Each column has its own scrollable feed, header with count badge, and inline
  message input
- Author name persisted to localStorage across sessions
- Hover-reveal pin/delete actions on each note
- Responsive: 4-col → 2-col → 1-col as viewport narrows
- Replaced all old `.mgmt-*` CSS classes with new `.wb-*` column-based styles

---

### 2026-03-20 — Weekly Features Schedule Column

**File(s) Changed:** pp/src/pages/SalesReportDetail.jsx **Type:** eature
**Summary:** Replaced the 4th whiteboard column with a weekly schedule for lunch
and dinner features.

**Details:**

- Created `weekly_features` table with unique constraint on (week_start,
  day_of_week, meal)
- Built `WeeklyFeatures.jsx` component with Mon-Sun rows, each showing lunch
  (☀️) and dinner (🌙) slots
- Click any slot to edit inline, press Enter to save or Escape to cancel
- Week navigation with prev/next arrows and date range label
- Today's row is highlighted with an orange accent border
- Removed `features` from the generic COLUMNS array in ManagementWhiteboard
- Added `.wf-*` CSS classes for the schedule layout

---

### 2026-03-20 — Refactor Kitchen Sales View

**File(s) Changed:** pp/src/pages/SalesReportDetail.jsx **Type:** eature
**Summary:** Redesigned the "Previous Night's Sales" detail view to match the
new UI mockups with a two-panel layout.

**Details:**

- Removed the `#` rank numbers from the item list
- Implemented a two-panel layout: "Top Selling Items (Volume)" and "Sales by
  Category"
- Top Selling Items panel:
  - Display item names in uppercase
  - Replaced plain counts with "XX ORDERS"
  - Updated progress bars to use vibrant gradients (`linear-gradient`)
- Sales by Category panel:
  - Added new panel using the `category` data extracted by the Edge Function
  - Calculates category percentage based on volume
  - Displays color-coded dots, category name, percentage, and total units sold
- Added `.sr-*` CSS classes for the new two-panel layout and stylized components

---

### 2026-03-21 — Refine Top Selling Items

**File(s) Changed:** `app/src/pages/SalesReportDetail.jsx` **Type:** `feature`
**Summary:** Refined the top selling items list to hide house cut fries, show 10
items instead of 8, and match item bar colors to their category.

**Details:**

- Filtered 'House Cut Fries' from displaying in the Top Selling Items panel
- Increased top sellers list count from 8 to 10
- Mapped item bar colors to respect the dynamically assigned color of their
  respective category

---

### 2026-03-22 — Hide Sweet Potato Fries

**File(s) Changed:** `app/src/pages/SalesReportDetail.jsx` **Type:** `feature`
**Summary:** Extended the Top Selling Items filter to also exclude Sweet Potato
Fries.

**Details:**

- Added sweet potato fries to the filtering logic for the volume list

---

### 2026-03-23 — Events & Banquets Migration and Parse

**File(s) Changed:** `app/src/components/ManagementWhiteboard.jsx`,
`app/src/pages/OfficeDashboard.jsx`, `app/src/App.jsx`,
`app/src/pages/EventsBanquetsPage.jsx`,
`supabase/migrations/20260323083000_upcoming_banquets.sql`,
`supabase/functions/process-banquets/index.ts` **Type:** `feature` **Summary:**
Extracted Special Events & Catering from whiteboard into dedicated page with new
Postmark webhook matching PDF data ingestion.

**Details:**

- Created upcoming_banquets table and process-banquets Edge Function utilizing
  Gemini 3 Flash
- Removed events column from ManagementWhiteboard and extracted the logic to
  EventsBanquetsPage
- Combined parsed upcoming banquets table alongside coordination feed into new
  dedicated view
- Populated OfficeDashboard stats and tiles with dynamic navigation linking to
  /office/events

---

### 2026-03-23 — ReserveCloud Scraping Implementation

**File(s) Changed:** `supabase/functions/process-banquets/index.ts` **Type:**
`feature` **Summary:** Upgraded the Edge Function Postmark webhook payload
ingestor to manually scrape, proxy fetch, and Base64-render implicit
ReserveCloud links from email bodies without file attachments.

**Details:**

- Upgraded Gemini API strings to standard gemini-3-flash-preview
- Injected a Regex scanner over body.Text and HTML fields looking for
  reservecloud routing URLs
- Created secondary etch and Regex pass parsing the ReserveCloud DOM for
  implicit PDF download paths
- Successfully passed arraybuffers natively as base64 to Gemini fallback without
  size stack limit blowouts

---

### 2026-03-24 — Fixed BEO Upload CORS and Prompt

**File(s) Changed:** `supabase/config.toml`,
`supabase/functions/process-beo/index.ts` **Type:** `fix` **Summary:** Fixed the
browser-to-edge CORS preflight rejection issue and refined the extraction prompt
for food items on BEOs.

**Details:**

- Added CORS Headers and OPTIONS route interceptor to `process-beo`
- Modified `config.toml` to allow non-JWT access for internal dashboard upload
  capability
- Upgraded Gemini 3 Flash prompt to explicitly locate and extract tabular food
  item arrays with associated quantities from ReserveCloud BEOs

---

### 2026-03-24 — Fixed UI Stale Data

**File(s) Changed:** `app/src/pages/EventsBanquetsPage.jsx` **Type:** `fix`
**Summary:** Added automated background polling and a manual refresh trigger to
dynamically catch incoming webhook database entries without hard page reloads.

**Details:**

- Handled Edge-to-DB event synchronization delays by looping `loadBanquets`
  quietly in the background.
- Embedded a manual `Refresh` UI button alongside `Upload BEO`.

---

### 2026-03-24 — Fixed Office Dashboard Tasks Route

**File(s) Changed:** `app/src/components/OfficeLayout.jsx` **Type:** `fix`
**Summary:** Corrected the bottom navigation routing for the "Tasks" tab to
point to the correct task administration page.

**Details:**

- Changed the `to` attribute for the Tasks tab from `/office/chat` to
  `/office/history`
- Prevents the office dashboard from incorrectly sending users to the AiChat
  component when they want to view the task history log.

---

### 2026-03-25 — In-App Recipe Creator

**File(s) Changed:** `app/src/pages/RecipeCreator.jsx`, `app/src/App.jsx`,
`app/src/pages/WorkbookLibrary.jsx`, `app/src/pages/KitchenRecipes.jsx`,
`app/src/index.css` **Type:** `feature` **Summary:** Added a full in-app recipe
creation page accessible from both kitchen and office dashboards with an
editable ingredient table, auto-calculated costs, assembly instructions, and
category tagging.

**Details:**

- Created `RecipeCreator.jsx` with recipe name input, category selector, dynamic
  ingredient table (Ingredient, Quantity, Measure, Unit Cost, Total Cost), and
  assembly textarea
- Total Cost auto-calculates as Quantity × Unit Cost
- Add/Remove row buttons for ingredient management
- Saves using existing `workbooks`/`workbook_sheets`/`workbook_chunks` schema
  for seamless WorkbookViewer compatibility
- Triggers `embed-chunks` edge function for AI RAG embedding on save
- Added routes: `/kitchen/recipes/create` and `/office/workbooks/create`
- Added green "Create Recipe" button to KitchenRecipes and "Create" button to
  WorkbookLibrary
- Added `.rc-*` CSS classes for inline cell inputs, readonly fields, remove
  buttons, and assembly textarea

---

### 2026-03-25 — Recipe Creator Single-Sheet Fix

**File(s) Changed:** `app/src/pages/RecipeCreator.jsx` **Type:** `fix`
**Summary:** Merged ingredients and assembly into a single sheet so
WorkbookViewer displays everything on one page with no tabs.

**Details:**

- Removed separate "Assembly" sheet; assembly lines are now appended after
  ingredient rows with a blank separator and a "— ASSEMBLY —" label row
- `sheet_count` is now always `1`
- Sheet name now uses the recipe name instead of "Ingredients"
- AI chunk also includes both ingredient and assembly content in one block

---

### 2026-03-25 — Move 86'd Items to Kitchen Dashboard

**File(s) Changed:** `app/src/components/EightySixFeed.jsx`,
`app/src/pages/Dashboard.jsx`, `app/src/index.css`,
`app/src/components/ManagementWhiteboard.jsx` **Type:** `feature` **Summary:**
Moved the 86'd Items & Alerts feed from the office Management Board to the
kitchen dashboard with full CRUD. Rearranged the dashboard grid so the Recipes
card sits next to Sales.

**Details:**

- Created `EightySixFeed.jsx` with post, delete, and pin/unpin capabilities
  (queries `management_notes` where `category='alerts'`)
- Updated `Dashboard.jsx` to render `<EightySixFeed />` in the grid-area under
  Tasks, moved Active Recipes card next to Sales
- Updated CSS grid-template-areas: `eightysix` replaces `recipes` position,
  `recipes` now shares row with `sales`
- Added `.eightysix-*` CSS classes for feed items, input bar, and pinned state
  styling
- Removed `alerts` column from `ManagementWhiteboard.jsx` COLUMNS array (only
  `comms` remains on office board)

---

### 2026-03-26 — Swap Recipes Tile to Left of Sales

**File(s) Changed:** `app/src/index.css` **Type:** `fix` **Summary:** Moved the
Active Recipes card to the left column of the bottom grid row, with Sales
spanning the remaining two columns on the right.

**Details:**

- Changed grid-template-areas row from `"sales sales recipes"` to
  `"recipes sales sales"`

---

### 2026-03-26 — Dashboard Tile Hover Effect

**File(s) Changed:** `app/src/index.css` **Type:** `feature` **Summary:** Added
a floating lift effect with subtle orange glow to all kitchen dashboard tiles on
hover.

**Details:**

- Added `transition` for transform, box-shadow, and border-color to `.dash-card`
- On hover: `translateY(-4px)` to float the card up, orange-tinted `box-shadow`
  underneath, and orange-tinted border

---

### 2026-03-26 — Uniform Dashboard Tile Border Thickness

**File(s) Changed:** `app/src/index.css` **Type:** `fix` **Summary:** Increased
`.dash-card` border from 1px to 2px so all tiles match the visual weight of the
wider Sales card.

**Details:**

- Changed `border: 1px solid` to `border: 2px solid` on `.dash-card`

---

### 2026-03-26 — Office Dashboard Tile Hover Effect

**File(s) Changed:** `app/src/index.css` **Type:** `feature` **Summary:**
Updated office dashboard tile hover to show an orange outline with a blue glow
background.

**Details:**

- `.office-tile:hover` now has `border-color: var(--orange)` (orange outline),
  `box-shadow` with blue (`rgba(96, 165, 250, 0.2)`) glow, subtle blue
  background tint, and `translateY(-4px)` float

---

### 2026-03-26 — Fix BEO Multi-Event PDF Parsing

**File(s) Changed:** `supabase/functions/process-beo/index.ts` **Type:** `fix`
**Summary:** Fixed BEO parsing edge function to correctly handle PDFs containing
multiple events. Previously treated Gemini output as a single object instead of
an array, causing all fields to be undefined and stored as "Unknown Event".

**Details:**

- Updated Gemini prompt to always return a JSON array of events
- Added array normalization: `if (!Array.isArray(parsed)) parsed = [parsed]`
- Loop through each event and insert individually
- Added raw Gemini output logging and per-event insertion diagnostics
- Fixed `btoa(String.fromCharCode(...spread))` stack overflow by using chunked
  encoding (8KB chunks)
- Restored correct model name (`gemini-3-flash-preview`)
- Deployed to Supabase via `npx -y supabase functions deploy`

---

### 2026-03-26 — BEO Table Management: Delete, Clear All, Completion Checkbox

**File(s) Changed:** `app/src/pages/EventsBanquetsPage.jsx`,
`app/src/index.css`,
`supabase/migrations/20260326170306_add_completed_to_beo.sql` **Type:**
`feature` **Summary:** Added interactive management controls to the BEO table:
per-row delete button, a "Clear All" button, and a completion checkbox that
strikes through the event row when checked.

**Details:**

- Added `handleDeleteBEO()` — deletes individual BEO from DB and removes from
  state
- Added `handleClearAllBEOs()` — confirmation prompt, then bulk deletes all BEO
  records
- Added `toggleBEOComplete()` — toggles `completed` boolean column, UI
  immediately updates with strikethrough
- Added `beo-check` checkbox column with blue accent color
- Added `beo-completed` CSS class: `text-decoration: line-through`,
  `opacity: 0.5`
- Created migration file to add `completed boolean DEFAULT false` column to
  `banquet_event_orders`
- "Clear All" button styled red for visibility, placed in card header

---

### 2026-03-26 — BEO Card Rename & Sort Order Fix

**File(s) Changed:** `app/src/pages/EventsBanquetsPage.jsx` **Type:** `fix`
**Summary:** Renamed "Recent Event Orders (BEOs)" to "Banquet Event Orders".
Fixed sort order so soonest dates appear first by removing `.slice().reverse()`
— the DB query already sorts ascending by `event_date`.

**Details:**

- Changed card title text to "Banquet Event Orders"
- Removed `.slice().reverse()` from the `beos.map()` render so the ascending DB
  order is preserved

---

### 2026-03-26 — Fix BEO Quantity Number Wrapping

**File(s) Changed:** `app/src/pages/EventsBanquetsPage.jsx` **Type:** `fix`
**Summary:** Fixed quantity numbers splitting across lines when food item
descriptions wrap. Added `white-space: nowrap`, `flex-shrink: 0`, and a gap to
the quantity span.

**Details:**

- Quantity span: `whiteSpace: 'nowrap'`, `flexShrink: 0`, `minWidth: '28px'`,
  `textAlign: 'right'`
- Item span: `flex: 1` so it takes remaining space and wraps naturally
- Added `gap: '8px'` between item text and quantity

---

### 2026-03-27 — BEO Card Layout Redesign for Readability

**File(s) Changed:** `app/src/pages/EventsBanquetsPage.jsx` **Type:** `feature`
**Summary:** Redesigned the Banquet Event Orders section from a cramped table
layout to individual event cards with wider food item display, preventing
excessive line wrapping.

**Details:**

- Replaced `<table>` layout with stacked card-per-event layout
- Each event card has a clear header: event name (1.1rem, bold), date with
  weekday, and guest count with icons
- Food items displayed in a CSS Grid (`1fr auto`) with item name column taking
  full width and quantity right-aligned
- Font size increased from `0.9em` to `0.95rem` with `line-height: 1.5` for
  readability
- Added column headers (Item | Qty) in the food items grid
- Subtle blue-tinted background on each event card for visual separation
- Completed events retain opacity/strikethrough behavior
- Reduced right coordination panel from 350px to 300px to give BEO cards more
  horizontal space

---

### 2026-03-27 — Events & Catering on Kitchen Dashboard

**File(s) Changed:** `app/src/pages/EventsBanquetsPage.jsx`, `app/src/App.jsx`,
`app/src/pages/Dashboard.jsx`, `app/src/index.css` **Type:** `feature`
**Summary:** Made the Events & Catering page available to kitchen crew as a
read-only view accessible from the kitchen dashboard.

**Details:**

- Added `readOnly` prop to `EventsBanquetsPage` — when true, hides Upload BEO,
  Clear All, completion checkboxes, delete (X) buttons, and the coordination
  panel
- Back button routes to `/kitchen` instead of `/office` in readOnly mode
- Grid goes full-width (single column) in readOnly mode since coordination panel
  is hidden
- Added `/kitchen/events` route in `App.jsx` wrapped in `KitchenLayout`
- Added "Upcoming Events" tile to kitchen `Dashboard.jsx` with dynamic BEO count
  and blue champagne-glasses icon
- Updated CSS `.dashboard-grid` template-areas to include `events` area
  alongside `recipes` and `sales`
- Added `.events-card` CSS class with `grid-area: events`
- Updated mobile grid breakpoint to include `events` in the stacked layout

---

### 2026-03-28 — Show Event Times on BEO Cards

**File(s) Changed:** `app/src/pages/EventsBanquetsPage.jsx` **Type:** `feature`
**Summary:** Added event start time display to each BEO card between the date
and guest count.

**Details:**

- Added clock icon (`fa-regular fa-clock`) and `b.start_time` display to the
  event metadata row
- Time shows between date and guest count (e.g. "Fri, Mar 27, 2026 · 🕐 5:00 PM
  · 👥 21 guests")
- Only renders when `start_time` is present (conditionally guarded)
- Added `flexWrap: 'wrap'` to the metadata row for better mobile behavior
- No DB or edge function changes needed — `start_time` column and Gemini
  extraction already existed

---

### 2026-04-07 — Move Lunch & Dinner Features to Dashboards

**File(s) Changed:** `app/src/components/ManagementWhiteboard.jsx`,
`app/src/pages/OfficeDashboard.jsx`, `app/src/pages/Dashboard.jsx` **Type:**
`feature` **Summary:** Moved the Lunch & Dinner Features weekly calendar from
the Board/ManagementWhiteboard page onto both the Office and Kitchen dashboards,
displayed directly below the weather forecast card.

**Details:**

- Removed `<WeeklyFeatures />` and its import from `ManagementWhiteboard.jsx`
- Added `WeeklyFeatures` import and rendered it after `<WeatherWidget />` in
  `OfficeDashboard.jsx` (wrapped in `office-weather-row` for consistent width)
- Added `WeeklyFeatures` import and rendered it after `<WeatherWidget />` in
  `Dashboard.jsx` (Kitchen dashboard)

---

### 2026-04-07 — Fix Features Card Grid Position on Kitchen Dashboard

**File(s) Changed:** `app/src/index.css` **Type:** `fix` **Summary:** Fixed the
Lunch & Dinner Features card appearing in the wrong grid position on the kitchen
dashboard. It was auto-placed by the grid rather than locked below the forecast.

**Details:**

- Added `"features  features  features"` row to `dashboard-grid`
  grid-template-areas immediately after the `weather` row
- Replaced `margin-top` on `.wf-calendar` with `grid-area: features` so the card
  locks into the correct named slot
- Added `"features"` to the mobile breakpoint stack order (after weather, before
  notes)

---

### 2026-04-07 — Fix Office Dashboard Route Mismatch

**File(s) Changed:** `app/src/pages/OfficeDashboard.jsx` **Type:** `fix`
**Summary:** OfficeDashboard was still using department-scoped links
(`/office/${dept}/...`) from a reverted commit, but App.jsx routes are at
`/office/...`. Rewrote to use direct `/office/...` paths.

**Details:**

- Removed `useParams()`, `DEPT_META` config, and the `base` path builder
- All tile links now use static `/office/...` paths matching App.jsx routes
- Removed department-specific filtering on briefings/tasks queries
- Removed "Departments" back-button (no longer applicable)
- Kept WeeklyFeatures and SalesBriefing cards

---

### 2026-04-08 — Remove FOH Code & Fix Briefings on Main Branch

**File(s) Changed:** `app/src/pages/Briefings.jsx`,
`app/src/pages/OfficeDashboard.jsx`, `app/src/pages/SalesReports.jsx`,
`app/src/pages/SalesReportDetail.jsx`, `app/src/components/SalesBriefing.jsx`
**File(s) Deleted:** `app/src/pages/FohDashboard.jsx`
**Type:** `fix`
**Summary:** Previous cleanup was done on a feature branch that was deleted
before merging. Re-applied all FOH removal and dept-scoping fixes directly to
main. Fixed the briefings page showing empty because it was filtering by an
undefined `:dept` param.

**Details:**

- `Briefings.jsx`: Removed `useParams`, `DEPT_LABELS`, and `.eq('department',
  dept)` filter — briefings now load without department filtering. Links use
  static `/office/briefings/...` paths
- `OfficeDashboard.jsx`: Removed stale `notes` state and `management_notes`
  query for the deleted Board tile
- `SalesReports.jsx`, `SalesReportDetail.jsx`, `SalesBriefing.jsx`: Removed
  `/foh` path checks and dept-scoped office path parsing
- Deleted `FohDashboard.jsx` on main
- Final audit: zero `foh` references remain across all source files

---

### 2026-04-08 — Sales Intelligence for Assistant & Extracted Item Pricing

**File(s) Changed:** `supabase/functions/process-sales-data/index.ts`, `supabase/functions/kitchen-assistant/index.ts`, `app/src/components/AssistantWidget.jsx`
**Type:** `feature`
**Summary:** Upgraded the AI Assistant to intelligently answer natural-language
questions about sales data, and updated the sales parser to capture item pricing.

**Details:**

- **Database:** Added `unit_price` and `total_revenue` columns to the
  `sales_data` table to allow tracking dollars not just units.
- **Sales Parser:** Updated `process-sales-data` edge function prompt and schema
  to extract `unit_price` and `total_revenue` from uploaded PDFs, falling back
  to 0 for older unpriced fields. Added a delete-before-insert step so
  re-uploading same-day reports avoids duplicates.
- **Assistant Backend:** Rewrote `kitchen-assistant` edge function. Added sales
  intent keyword detection (`"sold", "revenue", "how many"`, etc.). If detected, it
  short-circuits the vector RAG pipeline, queries `sales_data` for the 
  inferred date window ("this week", "yesterday", "this month"), aggregates the
  data by item/category with percentages, formatting it into a text table.
  Passes the table directly to Gemini along with the user's question.
- **Assistant UI:** Updated `AssistantWidget.jsx` with a new greeting including
  sales questions, and surfaced three common predefined sales prompts as
  quick-access chips when beginning a chat.
### 2026-04-08 — Add Manager Board to Office Dashboard

**File(s) Changed:** `app/src/pages/OfficeDashboard.jsx` **Type:** `feature`
**Summary:** Added the ManagementWhiteboard component to the Office Dashboard,
giving managers a chat-style message board to post notes for other managers.

**Details:**

- Imported existing `ManagementWhiteboard` component (was unused after earlier
  refactors)
- Rendered it as a full-width card at the bottom of the office grid
- No DB changes needed — uses existing `management_notes` table with `comms`
  category
- All existing CSS (`.wb-*` classes) was already in `index.css`
- Supports posting, pinning, deleting, author names, and relative timestamps

---

### 2026-04-09 — Office Dashboard V2 Overhaul

**File(s) Changed:** `index.css`, `OfficeLayout.jsx`, `OfficeDashboard.jsx`, `WeeklyFeatures.jsx`, `ManagementWhiteboard.jsx` **Type:** `feature`
**Summary:** Completely overhauled the Office Dashboard layout, transitioning it to a premium desktop-first sidebar navigation and grid-based widget system based on V2 prototype design.

**Details:**

- **CSS Updates**: Migrated Tailwind styles from the design prototype into Vanilla CSS (`.office-v2-*`) to isolate and ensure safety for legacy components.
- **OfficeLayout**: Refactored to support a responsive Sidebar (`.office-v2-sidebar`) on Desktop, which hides gracefully on mobile in favor of the existing bottom navigation bar.
- **OfficeDashboard**: Entirely rebuilt the main template to match the V2 UI prototype grids, including a top stats bar, flexible widget structure, and 2-column communication & sales mock areas.
- **Widget Refactoring**: 
  - Updated `WeatherWidget` to render a `compact` mode specifically molded for the top V2 stats grid.
  - Refactored `WeeklyFeatures` JSX block to directly weave the state hooks into `.office-v2-calendar-grid` layout provided in the mockup.
  - Added a `hideHeader` prop to `ManagementWhiteboard` to integrate seamlessly beneath new standalone dashboard panel wrapper headers.
