# Prep List Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered prep list generator to the Events & Catering page that reads BEO food items and inserts kitchen prep tasks (with subtasks) directly into the existing task system; also upgrades the task system to support subtasks for all tasks.

**Architecture:** New `generate-prep-tasks` Supabase edge function calls `gemini-3.1-pro-preview` with few-shot examples to return structured prep tasks with optional subtasks. A migration adds `parent_id` and `is_generated` columns to `event_tasks` to support the hierarchy and regeneration logic. The frontend `renderBeoTasks` function is updated to render the parent/subtask tree and host the generate button.

**Tech Stack:** React 19, Supabase JS client, Supabase Edge Functions (Deno), Gemini API (`gemini-3.1-pro-preview`), PostgreSQL (self-referential FK)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260508000000_add_subtasks_to_event_tasks.sql` | Create | Adds `parent_id` + `is_generated` columns to `event_tasks` |
| `supabase/functions/generate-prep-tasks/index.ts` | Create | Edge function — calls Gemini, returns `{ tasks: [{task, subtasks[]}] }` |
| `app/src/pages/EventsBanquetsPage.jsx` | Modify | State, 2 new functions, updated `renderBeoTasks`, 2 call-site fixes |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260508000000_add_subtasks_to_event_tasks.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add subtask hierarchy and AI-generation tracking to event_tasks.
-- parent_id: NULL = root task; non-NULL = subtask of that parent (one level deep only).
-- ON DELETE CASCADE ensures deleting a parent automatically removes its subtasks.
-- is_generated: false = manual (default, backward compatible); true = AI-generated prep task.
ALTER TABLE event_tasks
  ADD COLUMN parent_id    uuid    REFERENCES event_tasks(id) ON DELETE CASCADE,
  ADD COLUMN is_generated boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the Supabase MCP tool to apply this migration to the `chajwmoohmiugdgvqjyo` project. Confirm the migration appears in `list_migrations` output afterward.

- [ ] **Step 3: Verify columns exist**

Run this SQL via the Supabase MCP `execute_sql` tool:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'event_tasks'
ORDER BY ordinal_position;
```

Expected: rows for `parent_id` (uuid, nullable) and `is_generated` (boolean, not null, default false) appear alongside existing columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260508000000_add_subtasks_to_event_tasks.sql
git commit -m "feat: add parent_id and is_generated columns to event_tasks"
```

---

## Task 2: Edge Function — `generate-prep-tasks`

**Files:**
- Create: `supabase/functions/generate-prep-tasks/index.ts`

- [ ] **Step 1: Create the edge function file**

```typescript
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Same beverage keyword list as generate-order-items — skip entire category
const BEVERAGE_KEYWORDS = [
  "beverage", "beverages", "bar", "drink", "drinks",
  "cocktail", "cocktails", "wine", "beer", "spirits",
  "alcohol", "juice", "coffee", "tea", "soda",
  "lemonade", "iced tea", "water", "sparkling water", "club soda", "tonic water",
  "bartending", "open bar", "consumption tab", "regular", "decaf", "sugars/sweeteners",
  "beverage cart", "na beverages", "standard beverage station", "mimosa bar",
];

function isBeverageCategory(name: string): boolean {
  const lower = name.toLowerCase();
  return BEVERAGE_KEYWORDS.some((kw) => lower.includes(kw));
}

interface BeoItem     { label?: string; description?: string; qty?: string }
interface BeoCategory { name?: string; items?: BeoItem[] }
interface BeoSection  { date?: string; time?: string; meal_type?: string; location?: string; categories?: BeoCategory[] }
interface PrepTask    { task: string; subtasks: string[] }

// Build human-readable menu text from BEO sections, filtering out beverages
function buildMenuText(sections: BeoSection[]): string {
  const lines: string[] = [];
  for (const section of sections) {
    const header = [section.meal_type, section.date, section.time, section.location]
      .filter(Boolean)
      .join(" | ");
    if (header) lines.push(`\n## ${header}`);
    for (const category of (section.categories || [])) {
      if (isBeverageCategory(category.name || "")) continue;
      if (category.name) lines.push(`  Category: ${category.name}`);
      for (const item of (category.items || [])) {
        const label = (item.label || "").trim();
        const desc  = (item.description || "").trim();
        if (label) lines.push(`    - ${label}`);
        if (desc)  lines.push(`      ${desc.split("\n").join("\n      ")}`);
      }
    }
  }
  return lines.join("\n").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sections, event_name, meal_types } = await req.json() as {
      sections: BeoSection[];
      event_name?: string;
      meal_types?: string[];
    };

    if (!Array.isArray(sections) || sections.length === 0) {
      return new Response(
        JSON.stringify({ error: "No sections provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const menuText = buildMenuText(sections);

    if (!menuText) {
      return new Response(
        JSON.stringify({ tasks: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventContext  = event_name || "banquet event";
    const mealContext   = (meal_types || []).filter(Boolean).join(", ") || "banquet";

    const prompt = `You are an experienced banquet prep chef creating a kitchen prep list for "${eventContext}" (${mealContext}).

For each food item on the menu, identify the physical kitchen prep tasks required — chopping, dicing, slicing, traying, making sauces, marinating, etc. Break each dish into its logical prep steps as subtasks.

EXAMPLES (use these as your reference for format and detail level):
- "Veal Meatballs — House made veal meatball with mushroom ragu and marinara"
  → task: "Veal Meatballs", subtasks: ["Make Veal Meatballs", "Mushroom Ragu", "Marinara"]
- "Smoked Brisket"
  → task: "Smoked Brisket", subtasks: ["Make Brine for Brisket", "Brine Brisket", "Rub Brisket with Seasoning Mixture"]
- "Omelet Station"
  → task: "Omelet Station", subtasks: ["Dice Onions", "Dice Peppers", "Slice Mushrooms", "Dice Ham", "Chop Bacon", "Sausage", "Cheese", "Dice Tomato", "Jalapeños"]
- "Bacon and Sausage"
  → task: "Bacon and Sausage", subtasks: ["Tray Bacon", "Tray Sausage"]
- "Fruit Salad"
  → task: "Fruit Salad", subtasks: ["Chop Pineapple", "Chop Honeydew", "Chop Cantaloupe", "Grapes", "Slice Strawberries"]
- "House Salad"
  → task: "House Salad", subtasks: ["Slice Tomatoes", "Shred Carrots", "Slice Cucumbers", "Slice Red Onion"]
- "Dinner Rolls"
  → task: "Dinner Rolls", subtasks: []

RULES:
- Each food item becomes exactly one task entry with zero or more subtasks
- Subtasks are specific physical prep actions (chop, dice, tray, slice, make, cook, brine, etc.)
- Items requiring zero kitchen prep (pre-packaged, already-made) get an empty subtasks array
- One subtask per distinct prep action — do not combine unrelated steps into one
- Use plain, short kitchen-style phrasing — no descriptions, no quantities, no long sentences
- Station components needing no prep (e.g. a bag of "Cheese", packaged "Sausage") are listed as-is in subtasks
- Do NOT include any beverage, bar, or drink items

MENU:
${menuText}

Return ONLY valid JSON in this exact shape — no markdown, no explanation:
{
  "tasks": [
    { "task": "string", "subtasks": ["string", "string"] }
  ]
}`;

    const geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const raw: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "{}";

    // Strip markdown fences if Gemini includes them despite responseMimeType
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    let parsed: { tasks?: PrepTask[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Gemini returned non-JSON output");
    }

    // Keep only entries with a string task name and a subtasks array
    const validated: PrepTask[] = (parsed.tasks || []).filter(
      (t) => t && typeof t.task === "string" && Array.isArray(t.subtasks)
    );

    return new Response(JSON.stringify({ tasks: validated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

- [ ] **Step 2: Deploy the edge function**

```bash
npx supabase functions deploy generate-prep-tasks --project-ref chajwmoohmiugdgvqjyo
```

Expected output: `Deployed Function generate-prep-tasks` with no errors.

- [ ] **Step 3: Smoke-test the function via curl**

Replace `<SUPABASE_ANON_KEY>` with the project anon key:

```bash
curl -X POST https://chajwmoohmiugdgvqjyo.supabase.co/functions/v1/generate-prep-tasks \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Test Banquet",
    "meal_types": ["Dinner"],
    "sections": [{
      "meal_type": "Dinner",
      "categories": [{
        "name": "Entrees",
        "items": [
          { "label": "Smoked Brisket", "description": "Slow smoked beef brisket" },
          { "label": "Fruit Salad", "description": "" }
        ]
      }]
    }]
  }'
```

Expected response shape:
```json
{
  "tasks": [
    { "task": "Smoked Brisket", "subtasks": ["Make Brine for Brisket", "Brine Brisket", "Rub Brisket with Seasoning Mixture"] },
    { "task": "Fruit Salad", "subtasks": ["Chop Pineapple", "Chop Honeydew", "Chop Cantaloupe", "Grapes", "Slice Strawberries"] }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-prep-tasks/index.ts
git commit -m "feat: add generate-prep-tasks edge function using gemini-3.1-pro-preview"
```

---

## Task 3: Frontend — New State + Data Functions

**Files:**
- Modify: `app/src/pages/EventsBanquetsPage.jsx`

- [ ] **Step 1: Add three new state variables** after the existing `generatingOrderFor` state at line ~39:

```javascript
const [generatingPrepFor, setGeneratingPrepFor] = useState(null)       // UUID | null — which BEO is generating prep
const [expandedTasks, setExpandedTasks] = useState({})                  // { [taskId]: boolean } — subtask expand state
const [newSubtaskText, setNewSubtaskText] = useState({})                // { [taskId]: string } — subtask input value
const [showSubtaskInputFor, setShowSubtaskInputFor] = useState({})      // { [taskId]: boolean } — show subtask input
```

- [ ] **Step 2: Add `generatePrepTasks` function** after `generateOrderItems` (around line ~224):

```javascript
// Call Gemini to generate kitchen prep tasks from BEO food items, insert into event_tasks
async function generatePrepTasks(beo) {
    if (!beo.sections || beo.sections.length === 0) {
        alert('This BEO has no menu sections to generate from.')
        return
    }
    setGeneratingPrepFor(beo.id)
    try {
        const meal_types = [...new Set(
            (beo.sections || []).map(s => s.meal_type).filter(Boolean)
        )]
        const { data, error } = await supabase.functions.invoke('generate-prep-tasks', {
            body: { sections: beo.sections, event_name: beo.event_name || '', meal_types },
        })
        if (error) throw error

        const tasks = data?.tasks || []
        if (tasks.length === 0) {
            alert('No prep tasks could be generated from this BEO.')
            return
        }

        // Delete AI-generated root tasks only — ON DELETE CASCADE handles their subtasks
        await supabase
            .from('event_tasks')
            .delete()
            .eq('beo_id', beo.id)
            .eq('is_generated', true)
            .is('parent_id', null)

        // Insert each parent task then its subtasks (must be sequential to get parent IDs)
        for (let i = 0; i < tasks.length; i++) {
            const { task: description, subtasks } = tasks[i]

            const { data: parentRow, error: insertErr } = await supabase
                .from('event_tasks')
                .insert({
                    beo_id: beo.id,
                    description,
                    is_generated: true,
                    sort_order: i * 100,
                    parent_id: null,
                })
                .select()
                .single()

            if (insertErr || !parentRow) continue

            if (subtasks && subtasks.length > 0) {
                const subtaskRows = subtasks.map((s, j) => ({
                    beo_id: beo.id,
                    parent_id: parentRow.id,
                    description: s,
                    is_generated: true,
                    sort_order: i * 100 + j + 1,
                }))
                await supabase.from('event_tasks').insert(subtaskRows)
            }
        }

        await loadAllEventTasks()
    } catch (err) {
        console.error('Error generating prep tasks:', err)
        alert('Failed to generate prep list. Please try again.')
    } finally {
        setGeneratingPrepFor(null)
    }
}
```

- [ ] **Step 3: Add `addSubtask` function** immediately after `addEventTask` (around line ~124):

```javascript
// Add a manual subtask to an existing task (office only)
async function addSubtask(parentId, beoId) {
    const text = (newSubtaskText[parentId] || '').trim()
    if (!text) return
    const siblings = (tasksByBeo[beoId] || []).filter(t => t.parent_id === parentId)
    await supabase.from('event_tasks').insert({
        beo_id: beoId,
        parent_id: parentId,
        description: text,
        is_generated: false,
        sort_order: siblings.length,
    })
    setNewSubtaskText(prev => ({ ...prev, [parentId]: '' }))
    setShowSubtaskInputFor(prev => ({ ...prev, [parentId]: false }))
    await loadAllEventTasks()
}
```

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/EventsBanquetsPage.jsx
git commit -m "feat: add generatePrepTasks and addSubtask functions to EventsBanquetsPage"
```

---

## Task 4: Frontend — Update `renderBeoTasks` UI

**Files:**
- Modify: `app/src/pages/EventsBanquetsPage.jsx` — `renderBeoTasks` at line 998, call sites at lines 579 and 591

- [ ] **Step 1: Update both `renderBeoTasks` call sites** to pass the full `b` object instead of `b.id`

At line 579, change:
```javascript
{renderBeoTasks(b.id)}
```
To:
```javascript
{renderBeoTasks(b)}
```

At line 591, change:
```javascript
{renderBeoTasks(b.id)}
```
To:
```javascript
{renderBeoTasks(b)}
```

- [ ] **Step 2: Replace the entire `renderBeoTasks` function** (lines 998–1070) with the updated version below:

```javascript
// Renders the tasks section for a specific BEO — supports subtasks and AI prep list generation
function renderBeoTasks(beo) {
    if (!showTasks) return null
    const beoId = beo.id
    const allTasks = tasksByBeo[beoId] || []

    // Separate root tasks from subtasks for hierarchical rendering
    const rootTasks = allTasks.filter(t => !t.parent_id)
    const subtasksByParent = {}
    allTasks.filter(t => t.parent_id).forEach(t => {
        if (!subtasksByParent[t.parent_id]) subtasksByParent[t.parent_id] = []
        subtasksByParent[t.parent_id].push(t)
    })

    const completedCount = allTasks.filter(t => t.is_completed).length
    const isGenerating = generatingPrepFor === beoId

    return (
        <div className="event-tasks-section">
            <div className="event-tasks-header">
                <span className="event-tasks-label">
                    <i className="fa-solid fa-list-check" style={{ marginRight: '6px', color: accent }} />
                    Tasks
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                    {allTasks.length > 0 && (
                        <span className="event-tasks-count">{completedCount}/{allTasks.length}</span>
                    )}
                    {isOffice && (
                        <button
                            className="btn btn-sm"
                            style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'transparent', border: `1px solid ${accentBorder}`, color: accent, flexShrink: 0 }}
                            onClick={() => generatePrepTasks(beo)}
                            disabled={isGenerating}
                            title="Generate prep list from BEO"
                        >
                            {isGenerating
                                ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }} />Generating...</>
                                : <><i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '4px' }} />Prep List</>
                            }
                        </button>
                    )}
                </div>
            </div>

            {rootTasks.length > 0 && (
                <div className="event-tasks-list">
                    {rootTasks.map(task => {
                        const subs = subtasksByParent[task.id] || []
                        // Default to expanded; only collapse when user explicitly toggles
                        const isExpanded = expandedTasks[task.id] !== false
                        const showInput = showSubtaskInputFor[task.id]

                        return (
                            <div key={task.id}>
                                {/* Root task row */}
                                <label className="event-task-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input
                                        type="checkbox"
                                        className="task-box"
                                        checked={task.is_completed}
                                        onChange={() => toggleEventTask(task.id, task.is_completed)}
                                    />
                                    <span
                                        className={`task-label ${task.is_completed ? 'completed' : ''}`}
                                        style={{ flex: 1, cursor: subs.length > 0 ? 'pointer' : 'default' }}
                                        onClick={subs.length > 0 ? (e) => {
                                            e.preventDefault()
                                            setExpandedTasks(prev => ({ ...prev, [task.id]: !isExpanded }))
                                        } : undefined}
                                    >
                                        {subs.length > 0 && (
                                            <i
                                                className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`}
                                                style={{ fontSize: '0.6rem', marginRight: '5px', color: 'var(--text-muted)' }}
                                            />
                                        )}
                                        {task.description}
                                    </span>
                                    {isOffice && (
                                        <>
                                            <button
                                                className="wb-act-btn"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    setShowSubtaskInputFor(prev => ({ ...prev, [task.id]: !showInput }))
                                                    // Auto-expand when opening subtask input
                                                    if (!showInput) setExpandedTasks(prev => ({ ...prev, [task.id]: true }))
                                                }}
                                                title="Add subtask"
                                                style={{ fontSize: '0.7rem', color: accent, flexShrink: 0 }}
                                            >
                                                <i className="fa-solid fa-plus" />
                                            </button>
                                            <button
                                                className="wb-act-btn wb-act-delete"
                                                onClick={(e) => { e.preventDefault(); deleteEventTask(task.id) }}
                                                title="Delete task"
                                                style={{ marginLeft: 0, fontSize: '0.75rem', flexShrink: 0 }}
                                            >
                                                <i className="fa-solid fa-xmark" />
                                            </button>
                                        </>
                                    )}
                                </label>

                                {/* Subtask list — indented, shown when expanded */}
                                {subs.length > 0 && isExpanded && (
                                    <div style={{ paddingLeft: '22px' }}>
                                        {subs.map(sub => (
                                            <label key={sub.id} className="event-task-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="checkbox"
                                                    className="task-box"
                                                    checked={sub.is_completed}
                                                    onChange={() => toggleEventTask(sub.id, sub.is_completed)}
                                                />
                                                <span className={`task-label ${sub.is_completed ? 'completed' : ''}`} style={{ flex: 1 }}>
                                                    {sub.description}
                                                </span>
                                                {isOffice && (
                                                    <button
                                                        className="wb-act-btn wb-act-delete"
                                                        onClick={(e) => { e.preventDefault(); deleteEventTask(sub.id) }}
                                                        title="Delete subtask"
                                                        style={{ marginLeft: 0, fontSize: '0.75rem', flexShrink: 0 }}
                                                    >
                                                        <i className="fa-solid fa-xmark" />
                                                    </button>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Add subtask inline input (office only, shown when + clicked) */}
                                {isOffice && showInput && (
                                    <div style={{ paddingLeft: '22px', display: 'flex', gap: '6px', marginTop: '4px', marginBottom: '2px' }}>
                                        <input
                                            className="input"
                                            type="text"
                                            placeholder="Add a subtask..."
                                            value={newSubtaskText[task.id] || ''}
                                            onChange={e => setNewSubtaskText(prev => ({ ...prev, [task.id]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(task.id, beoId) } }}
                                            style={{ fontSize: '0.82rem' }}
                                            autoFocus
                                        />
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: accent, color: '#fff', borderColor: accent, flexShrink: 0 }}
                                            onClick={() => addSubtask(task.id, beoId)}
                                            disabled={!(newSubtaskText[task.id] || '').trim()}
                                        >
                                            Add
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {isOffice && (
                <div className="event-task-add">
                    <input
                        className="input"
                        type="text"
                        placeholder="Add a task..."
                        value={newTaskText[beoId] || ''}
                        onChange={e => setNewTaskText(prev => ({ ...prev, [beoId]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEventTask(beoId) } }}
                        style={{ fontSize: '0.85rem' }}
                    />
                    <button
                        className="btn btn-sm"
                        style={{ background: accent, color: '#fff', borderColor: accent, flexShrink: 0 }}
                        onClick={() => addEventTask(beoId)}
                        disabled={!(newTaskText[beoId] || '').trim()}
                    >
                        Add
                    </button>
                </div>
            )}

            {rootTasks.length === 0 && !isOffice && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.25rem 0' }}>No tasks assigned</div>
            )}
        </div>
    )
}
```

- [ ] **Step 3: Verify the app compiles with no errors**

```bash
cd "C:\Old Hawthorne Projects\DailyBrief\app"
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/EventsBanquetsPage.jsx
git commit -m "feat: add prep list generator button and subtask UI to renderBeoTasks"
```

---

## Task 5: End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
cd "C:\Old Hawthorne Projects\DailyBrief\app"
npm run dev
```

- [ ] **Step 2: Test generate prep list (office view)**

1. Open `http://localhost:5173` → select Office → enter password `chef21`
2. Navigate to Events & Catering
3. Expand a BEO that has food items in its sections
4. Locate the task panel — confirm "Prep List" button with wand icon appears in the header next to the count
5. Click "Prep List" — confirm spinner appears and button is disabled during generation
6. After generation: confirm tasks appear in the task list with subtasks indented below parents
7. Confirm parent tasks have a chevron and are checkable (checkbox works independently)
8. Confirm subtasks are checkable independently

- [ ] **Step 3: Test regeneration preserves manual tasks**

1. Manually add a task via "Add a task..." input — confirm it appears
2. Click "Prep List" again — confirm spinner, then new AI tasks load
3. Confirm the manually added task is still present after regeneration
4. Confirm old AI-generated tasks are gone and replaced

- [ ] **Step 4: Test manual subtask addition**

1. Click the "+" button on any task (AI-generated or manual)
2. Confirm subtask input appears indented below the task
3. Type a subtask name → press Enter or click "Add"
4. Confirm subtask appears indented under the parent
5. Confirm parent task now shows a chevron
6. Click the parent task label — confirm subtasks collapse and expand

- [ ] **Step 5: Test kitchen view**

1. Go back to role select → choose Kitchen
2. Navigate to Events & Catering
3. Expand a BEO — confirm tasks and subtasks are visible and checkable
4. Confirm no "Prep List" button, no "+" buttons, no delete buttons are visible

- [ ] **Step 6: Update CHANGES.md**

Append to `C:\Old Hawthorne Projects\DailyBrief\CHANGES.md`:

```markdown
---

### 2026-05-08 — Prep List Generator + Subtask System

**File(s) Changed:**
`supabase/migrations/20260508000000_add_subtasks_to_event_tasks.sql` (new),
`supabase/functions/generate-prep-tasks/index.ts` (new),
`app/src/pages/EventsBanquetsPage.jsx`
**Type:** `feature`
**Summary:** Added AI-powered prep list generator to the Events page (office-only) and upgraded the task system to support subtasks on all tasks.

**Details:**

- New `generate-prep-tasks` Supabase edge function using `gemini-3.1-pro-preview` — reads BEO food sections, returns structured `{ tasks: [{ task, subtasks[] }] }` with few-shot examples for accuracy
- Migration adds `parent_id uuid` (self-referential FK, cascade) and `is_generated boolean` to `event_tasks`
- "Prep List" button (wand icon, office-only) appears in task panel header; clicking generates and inserts prep tasks with subtasks directly into the task list
- Regeneration clears only `is_generated = true` root tasks (cascade handles subtasks); manual tasks are preserved
- All tasks (AI or manual) support subtasks via "+" button per task (office-only); subtask input appears inline below the parent
- Parent tasks with subtasks show a chevron — clicking label expands/collapses; parent and subtasks each have independent checkboxes
- `renderBeoTasks` signature changed from `(beoId)` to `(beo)` — both call sites updated
```

- [ ] **Step 7: Final commit**

```bash
git add CHANGES.md
git commit -m "docs: update CHANGES.md for prep list generator and subtask system"
```
