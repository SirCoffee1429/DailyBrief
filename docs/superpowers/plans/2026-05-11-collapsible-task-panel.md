# Collapsible BEO Task Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chevron toggle to the task panel header inside each BEO card so crew can collapse/expand the task list.

**Architecture:** Add one piece of state (`collapsedTaskPanels`) keyed by `beoId`, add a chevron button to the existing `event-tasks-header`, and wrap the task body in a conditional render. Default state is expanded (falsy = expanded).

**Tech Stack:** React 19, Vite, JSX — no new dependencies.

---

## Files

| File | Change |
|------|--------|
| `app/src/pages/EventsBanquetsPage.jsx` | Add state (line ~44), add chevron button + conditional body in `renderBeoTasks` (lines ~1119–1138, ~1140–1275) |

---

### Task 1: Add `collapsedTaskPanels` state

**Files:**
- Modify: `app/src/pages/EventsBanquetsPage.jsx:44-46`

- [ ] **Step 1: Add state declaration**

Open `app/src/pages/EventsBanquetsPage.jsx`. Find this block (around line 44):

```js
    // Per-event prep list + subtask state
    const [generatingPrepFor, setGeneratingPrepFor] = useState(null)       // UUID | null — which BEO is generating prep
    const [expandedTasks, setExpandedTasks] = useState({})                  // { [taskId]: boolean } — subtask collapse state (default expanded)
    const [newSubtaskText, setNewSubtaskText] = useState({})                // { [taskId]: string } — subtask input value
    const [showSubtaskInputFor, setShowSubtaskInputFor] = useState({})      // { [taskId]: boolean } — show add-subtask input
```

Add one line after `expandedTasks`:

```js
    // Per-event prep list + subtask state
    const [generatingPrepFor, setGeneratingPrepFor] = useState(null)       // UUID | null — which BEO is generating prep
    const [expandedTasks, setExpandedTasks] = useState({})                  // { [taskId]: boolean } — subtask collapse state (default expanded)
    const [collapsedTaskPanels, setCollapsedTaskPanels] = useState({})      // { [beoId]: boolean } — true = collapsed, falsy/absent = expanded
    const [newSubtaskText, setNewSubtaskText] = useState({})                // { [taskId]: string } — subtask input value
    const [showSubtaskInputFor, setShowSubtaskInputFor] = useState({})      // { [taskId]: boolean } — show add-subtask input
```

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/EventsBanquetsPage.jsx
git commit -m "feat: add collapsedTaskPanels state for BEO task panel toggle"
```

---

### Task 2: Add chevron button to task panel header

**Files:**
- Modify: `app/src/pages/EventsBanquetsPage.jsx:1109-1138` (inside `renderBeoTasks`)

- [ ] **Step 1: Read `isCollapsed` and add chevron button**

Find this block inside `renderBeoTasks` (around line 1109):

```js
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
```

Replace with:

```js
        const completedCount = allTasks.filter(t => t.is_completed).length
        const isGenerating = generatingPrepFor === beoId
        const isCollapsed = collapsedTaskPanels[beoId] === true

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
                        <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: '2px 4px', flexShrink: 0 }}
                            onClick={() => setCollapsedTaskPanels(prev => ({ ...prev, [beoId]: !isCollapsed }))}
                            title={isCollapsed ? 'Expand tasks' : 'Collapse tasks'}
                            aria-label={isCollapsed ? 'Expand tasks' : 'Collapse tasks'}
                        >
                            <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'}`} />
                        </button>
                    </div>
                </div>
```

- [ ] **Step 2: Commit**

```bash
git add app/src/pages/EventsBanquetsPage.jsx
git commit -m "feat: add chevron collapse button to BEO task panel header"
```

---

### Task 3: Wrap task body in collapse conditional

**Files:**
- Modify: `app/src/pages/EventsBanquetsPage.jsx:1140-1275` (inside `renderBeoTasks`)

- [ ] **Step 1: Wrap the task list and add-task input**

Find the closing `</div>` of the `event-tasks-header` block (just after the header div closes, around line 1138). The content that follows looks like:

```jsx
                {rootTasks.length > 0 && (
                    <div className="event-tasks-list">
                        {/* ... all task rows ... */}
                    </div>
                )}

                {isOffice && (
                    <div className="event-task-add">
                        {/* ... add task input ... */}
                    </div>
                )}
```

Wrap both blocks in a single `{!isCollapsed && (...)}` fragment:

```jsx
                {!isCollapsed && (
                    <>
                        {rootTasks.length > 0 && (
                            <div className="event-tasks-list">
                                {/* ... all task rows — no changes inside ... */}
                            </div>
                        )}

                        {isOffice && (
                            <div className="event-task-add">
                                {/* ... add task input — no changes inside ... */}
                            </div>
                        )}
                    </>
                )}
```

Do not change anything inside those two blocks — only wrap them.

- [ ] **Step 2: Verify the file still renders correctly**

Run the dev server:

```bash
cd app && npm run dev
```

Open the app in a browser, navigate to the Events page (kitchen or office), expand a BEO card, and verify:
- The task panel shows with a chevron-up icon
- Clicking the chevron collapses the task list (chevron rotates to chevron-down)
- Clicking again expands it
- Task count badge and Generate Prep List button remain visible when collapsed
- Multiple BEO cards collapse independently

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/EventsBanquetsPage.jsx
git commit -m "feat: collapse BEO task panel body when chevron toggled"
```
