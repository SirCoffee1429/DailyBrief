# Prep List Generator — Design Spec
**Date:** 2026-05-08  
**Status:** Approved for implementation

---

## Context

The Events & Catering page already has an AI-powered Order List generator that reads BEO food items and produces a purchasable ingredient list. Managers need a parallel capability: a **Prep List** that reads the same BEO food items and generates the physical kitchen prep steps required (e.g., "Make Veal Meatballs", "Slice Tomatoes", "Tray Bacon"). These prep steps are inserted as real event tasks — with optional subtasks — so kitchen crew can check them off during prep.

Additionally, the entire task system is being upgraded to support subtasks: any task (AI-generated or manually added) can have child subtasks. Parent tasks with subtasks are non-checkable headers; their subtasks are what get checked off. Tasks with no subtasks remain flat checkable items.

---

## Scope

- New Supabase edge function: `generate-prep-tasks`
- New migration: adds `is_generated` and `parent_id` columns to `event_tasks`
- Frontend changes to `EventsBanquetsPage.jsx` only
- Model: `gemini-3.1-pro-preview`
- Embedding model and all other Gemini callers unchanged

---

## Data Model

### Migration: `event_tasks` column additions

```sql
-- Self-referential parent for subtask hierarchy (one level deep)
ALTER TABLE event_tasks
  ADD COLUMN parent_id uuid REFERENCES event_tasks(id) ON DELETE CASCADE,
  ADD COLUMN is_generated boolean NOT NULL DEFAULT false;
```

| Column | Purpose |
|---|---|
| `parent_id NULL` | Top-level task (root) |
| `parent_id = <uuid>` | Subtask belonging to that parent |
| `is_generated = false` | Manually added (default, backward compatible) |
| `is_generated = true` | AI-generated prep task |

**Rules:**
- Only one level of nesting — subtasks cannot have their own subtasks
- Parent tasks and subtasks are both independently checkable via their own `is_completed` flag
- Clicking a parent task's label/chevron expands or collapses its subtask list
- A parent task with no subtasks renders as a normal flat checkable task (no chevron)
- On regeneration: delete all `is_generated = true` tasks for the BEO (cascade deletes their subtasks automatically via `ON DELETE CASCADE`). Manually added tasks and their subtasks are preserved.

---

## Edge Function: `generate-prep-tasks`

**Location:** `supabase/functions/generate-prep-tasks/index.ts`

### Request Shape

```typescript
{
  sections: BeoSection[]   // Same structure as generate-order-items
  event_name: string       // Context for the prompt
  meal_types: string[]     // Extracted from sections[].meal_type
}
```

### Gemini Configuration

```
model: gemini-3.1-pro-preview
endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent
temperature: 0.1
maxOutputTokens: 4096
responseMimeType: "application/json"
```

### Beverage Filtering

Reuse the same `BEVERAGE_KEYWORDS` list from `generate-order-items` to exclude beverage/bar categories before building menu text sent to Gemini.

### Prompt Strategy

Role-prompt Gemini as an experienced banquet prep chef. Provide event name and meal types as context. Include real-world few-shot examples with subtasks embedded directly in the prompt.

**Few-shot examples:**

| BEO Item | task | subtasks |
|---|---|---|
| "Veal Meatballs — House made veal meatball with mushroom ragu and marinara" | Veal Meatballs | Make Veal Meatballs, Mushroom Ragu, Marinara |
| "Smoked Brisket" | Smoked Brisket | Make Brine for Brisket, Brine Brisket, Rub Brisket with Seasoning Mixture |
| "Omelet Station" | Omelet Station | Dice Onions, Dice Peppers, Slice Mushrooms, Dice Ham, Chop Bacon, Sausage, Cheese, Dice Tomato, Jalapeños |
| "Bacon and Sausage" | Bacon and Sausage | Tray Bacon, Tray Sausage |
| "Fruit Salad" | Fruit Salad | Chop Pineapple, Chop Honeydew, Chop Cantaloupe, Grapes, Slice Strawberries |
| "House Salad" | House Salad | Slice Tomatoes, Shred Carrots, Slice Cucumbers, Slice Red Onion |
| "Dinner Rolls" | Dinner Rolls | *(empty — no prep needed, already purchasable)* |

**Prompt rules:**
- Each food item becomes one task with zero or more subtasks
- Subtasks are specific physical prep actions (chop, dice, tray, slice, make, cook, etc.)
- Items requiring zero prep (packaged, pre-made) get an empty subtasks array
- One subtask per distinct action — do not combine unrelated steps
- Use plain, short kitchen-style phrasing (no descriptions, no quantities)
- Exclude all beverage/bar items (already filtered before Gemini call)

### Response Shape

```json
{
  "tasks": [
    {
      "task": "Smoked Brisket",
      "subtasks": ["Make Brine for Brisket", "Brine Brisket", "Rub Brisket with Seasoning Mixture"]
    },
    {
      "task": "Dinner Rolls",
      "subtasks": []
    }
  ]
}
```

**Insertion logic:**
- `subtasks` non-empty → insert parent row (`parent_id: null`, `is_completed` irrelevant in UI), then insert each subtask row with `parent_id = <parent.id>`
- `subtasks` empty → insert as a flat checkable task (`parent_id: null`)

### Error Responses

```json
{ "error": "No sections provided" }                     // 400
{ "error": "Internal server error", "details": "..." }  // 500
{ "tasks": [] }                                          // Valid empty result
```

---

## Frontend: `EventsBanquetsPage.jsx`

### New State Variables

```javascript
const [generatingPrepFor, setGeneratingPrepFor] = useState(null)    // UUID | null — which BEO is generating
const [expandedSubtaskInputs, setExpandedSubtaskInputs] = useState({}) // { [taskId]: boolean } — show subtask input
const [newSubtaskText, setNewSubtaskText] = useState({})             // { [taskId]: string }
```

### New Functions

**`generatePrepTasks(beo)`** — mirrors `generateOrderItems`:
1. Guard: if no sections → alert and return
2. Set `generatingPrepFor(beo.id)`
3. Extract `meal_types` from `beo.sections`
4. Call `supabase.functions.invoke('generate-prep-tasks', { body: { sections, event_name, meal_types } })`
5. Delete all `is_generated: true` tasks for this `beo.id` (cascade handles subtasks)
6. For each returned task:
   - Insert parent row → get back `id`
   - If subtasks present: bulk-insert subtask rows with `parent_id`
   - If no subtasks: parent row is the flat task
7. Call `loadAllEventTasks()`
8. Set `generatingPrepFor(null)` in finally block

**`addSubtask(parentId, beoId)`** — add a manual subtask to an existing task:
1. Read `newSubtaskText[parentId]`, trim, guard empty
2. Insert `{ beo_id: beoId, parent_id: parentId, description: text, is_generated: false }`
3. Clear input, reload tasks

**`toggleSubtaskInput(taskId)`** — show/hide the "Add subtask..." input for a task

### UI Changes in `renderBeoTasks(beoId)`

**Task panel header (office-only generate button):**
```jsx
{isOffice && (
  <button onClick={() => generatePrepTasks(beo)} disabled={generatingPrepFor === beoId}>
    {generatingPrepFor === beoId
      ? <><i className="fa-solid fa-spinner fa-spin" /> Generating...</>
      : <><i className="fa-solid fa-wand-magic-sparkles" /> Prep List</>
    }
  </button>
)}
```

**Task row rendering (split by whether task has subtasks):**

*Parent task with subtasks* — independently checkable AND clickable to expand/collapse subtask list:
```
[checkbox] [▾ task description]  [+ subtask button, office-only]  [delete, office-only]
  ↳ [checkbox] subtask 1                                           [delete, office-only]
  ↳ [checkbox] subtask 2                                           [delete, office-only]
  ↳ [Add subtask... input]  (office-only, shown inline when "+" clicked)
```

*Flat task (no subtasks)* — checkable item:
```
[checkbox] [task description]  [+ subtask button, office-only]  [delete, office-only]
```

**Converting flat → parent:** When "+" is clicked on a flat task and a subtask is saved, the task becomes a parent with an expand/collapse chevron. The task retains its own checkbox and `is_completed` state — parent and subtasks are each checked off independently. No confirmation needed.

**Visibility rules (unchanged):**
- Generate button: office only
- Add task input: office only
- Add subtask button / input: office only
- Delete buttons: office only
- Task list + checkboxes: office + kitchen (FOH excluded)

### `loadAllEventTasks` update

Query unchanged — fetches all columns including new `parent_id` and `is_generated`. Grouping by `beo_id` unchanged. Rendering layer separates root tasks (`parent_id === null`) from subtasks (`parent_id !== null`) and nests them.

---

## File Checklist

| File | Change |
|---|---|
| `supabase/migrations/YYYYMMDD_add_subtasks_to_event_tasks.sql` | New — `parent_id` + `is_generated` columns |
| `supabase/functions/generate-prep-tasks/index.ts` | New — edge function |
| `app/src/pages/EventsBanquetsPage.jsx` | Modified — state, 3 new functions, updated render |

---

## Verification

1. **Generate (office):** Open BEO with food items → click "Prep List" → spinner → tasks + subtasks populate in task section
2. **Regenerate:** Click again → AI-generated tasks cleared → new ones populate → manual tasks preserved
3. **Kitchen view:** Generated prep tasks visible and subtasks checkable — no generate button
4. **Manual subtask:** Click "+" on any task (office) → type subtask → saves and appears indented
5. **Flat task:** Task with empty subtasks array renders as normal checkable row
6. **FOH:** Task section not shown (unchanged)
7. **Empty BEO:** Alert, no API call
8. **Beverage-only BEO:** Returns `{ tasks: [] }`, no tasks inserted
