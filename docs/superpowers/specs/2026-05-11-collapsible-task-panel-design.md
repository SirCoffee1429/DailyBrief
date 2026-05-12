# Collapsible BEO Task Panel — Design Spec

**Date:** 2026-05-11
**Scope:** `EventsBanquetsPage.jsx` only

---

## Summary

Add a collapse toggle to the task panel rendered inside each BEO card. The panel is expanded by default; crew can collapse it to reduce visual clutter when tasks aren't the focus.

---

## State

Add one new state entry to `EventsBanquetsPage`:

```js
const [collapsedTaskPanels, setCollapsedTaskPanels] = useState({})
// { [beoId]: boolean } — true = collapsed, falsy/absent = expanded
```

Defaulting to an empty object means all panels start expanded without needing explicit initialization per BEO.

---

## Header Row Changes (`renderBeoTasks`)

The existing `event-tasks-header` div has:
- Left: "Tasks" label with icon
- Right: task count badge + "Generate Prep List" button (office only)

Add a chevron button at the far right:
- Icon: `fa-chevron-up` when expanded, `fa-chevron-down` when collapsed
- Clicking it toggles `collapsedTaskPanels[beoId]`
- Styled minimally (transparent background, accent color) to match existing icon buttons
- The count badge and generate button remain visible and functional regardless of collapse state

---

## Body Conditional

Wrap all content below the header — the `rootTasks` list and the add-task input — in a single `{!collapsedTaskPanels[beoId] && ...}` conditional. No CSS animation.

---

## Affected Files

| File | Change |
|------|--------|
| `app/src/pages/EventsBanquetsPage.jsx` | Add `collapsedTaskPanels` state, chevron button to header, body conditional |

No other files, no CSS additions required.

---

## Non-Goals

- No persistence of collapse state across page reloads
- No animation on collapse/expand
- Does not affect the kitchen dashboard briefing tasks card (separate component)
