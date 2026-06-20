# Workflow: "Working On It" State for Event Tasks

**Feature:** Anonymous 3-state tap cycle (todo → in progress → done) on every event
task and subtask, syncing live across all devices on the Events & Banquets page.
**Generated:** 2026-06-19
**Status:** Plan only — no code written yet. Next step: `/sc:implement`.

---

## 1. Locked Decisions (from brainstorm + design)

| # | Decision |
|---|----------|
| D1 | **No names / no attribution / no identity.** Pure anonymous tap. |
| D2 | Status attaches to **every task AND subtask** independently. |
| D3 | Three visual states: **todo → in progress → done** (tap to advance). |
| D4 | Audience: **kitchen crew + office**, on the **Events & Banquets page**. |
| D5 | **No elapsed time**, no `started_at`, no timeout/auto-release jobs. |
| D6 | **Parent does NOT reflect a subtask being in progress.** Fully independent rows. |
| D7 | Must sync **live across all devices** (realtime — net-new for `event_tasks`). |

## 2. Data Model (from `/sc:design` — settled)

Single additive column; the third state is derived, not stored separately.

```sql
ALTER TABLE event_tasks ADD COLUMN in_progress boolean NOT NULL DEFAULT false;
ALTER PUBLICATION supabase_realtime ADD TABLE event_tasks;
ALTER TABLE event_tasks REPLICA IDENTITY FULL;
```

Derived status: `is_completed → done`, else `in_progress → in progress`, else `todo`.
Invariant: **`in_progress` and `is_completed` are never both true.**

## 3. Affected Files

| File | Change |
|------|--------|
| `supabase/migrations/20260619000000_event_task_in_progress.sql` (NEW) | Column + realtime publication + replica identity |
| `app/src/pages/EventsBanquetsPage.jsx` | New `toggleInProgress` fn; update `toggleEventTask` to clear `in_progress` on completion; 3-state tap UI for root + subtasks; realtime subscription |
| `app/src/index.css` | In-progress visual treatment (amber) for `.event-task-row` / `.task-label` |

No RLS change (open `allow_all` already permits the `UPDATE`). No index. No backfill
(existing 95 rows default to `false` → behave exactly as today).

---

## 4. Implementation Phases

### Phase 1 — Database migration  *(blocks all other phases)*

1. Write `supabase/migrations/20260619000000_event_task_in_progress.sql` with the three
   statements in §2.
2. Apply to production Supabase (project ref `chajwmoohmiugdgvqjyo`).
3. **Checkpoint 1 — verify:**
   - Column exists, default `false`, all 95 rows `false`.
   - `pg_publication_tables` now lists `event_tasks` under `supabase_realtime`.
   - `relreplident = 'f'` (FULL) on `event_tasks`.

**Dependency:** none. Must complete before Phases 2–4 are testable.

---

### Phase 2 — Data layer (state transitions)

The existing `loadAllEventTasks()` uses `select('*')`, so the new column is fetched
automatically — no load change needed. Two write paths:

1. **New `toggleInProgress(taskId, current)`** — flips `in_progress` for **only that one
   row** (no cascade — D6). Immutable local state update mirroring the existing
   `setTasksByBeo` spread pattern. Writes `{ in_progress: !current }` to Supabase.
2. **Update `toggleEventTask` (completion path)** — when a task becomes completed, also
   set `in_progress = false` in the same update (enforce the invariant). The existing
   parent↔subtask **completion** cascade stays exactly as-is; extend each completion
   update to also clear `in_progress` on the rows it completes. Un-completing leaves
   `in_progress = false` (lands in todo, not back in progress).

**Edge cases to honor:**
- Completing an in-progress task → clears `in_progress` (no orphaned amber state).
- Parent completed → subtasks completed AND their `in_progress` cleared.
- `in_progress` never cascades parent↔child (D6) — only completion does.

**Dependency:** Phase 1.

---

### Phase 3 — UI interaction + visual state

Decide and implement the **tap model** for the row. Current rows use a checkbox bound to
`is_completed`. A single checkbox can't express 3 states, so:

- **Recommended interaction:** keep the **checkbox = done** (tap checkbox to complete /
  un-complete, preserving existing muscle memory + cascade), and make the **task label /
  row body** the in-progress toggle: tap label → toggles `in_progress` on/off. This gives
  a clean "tap row to mark working, tap checkbox to finish" without overloading one control.
  - Note: root-task labels with subtasks already use the label click to expand/collapse.
    For those, in-progress toggle needs a distinct affordance (e.g. a small "working" pill
    button) so it doesn't collide with expand. Subtasks and childless root tasks can use
    the label tap directly.
- Confirm this interaction with the owner during implement before wiring (it's the one
  remaining UX ambiguity).

**Visual treatment (CSS):**
- In-progress row: amber accent (e.g. left border / soft background `rgba(245,158,11,…)`),
  optional subtle pulse. Distinct from the blue event accent and from completed (struck/muted).
- Three clearly different looks: todo (default), in progress (amber), done (existing
  completed style).
- Must fit the dense mobile task rows (NFR5).

**Dependency:** Phase 2.

---

### Phase 4 — Realtime cross-device sync  *(the net-new infrastructure)*

The page has **no** realtime subscription today. Mirror the established pattern already
used in `CoverageTemplateSection.jsx`, `RosterManager.jsx`, `SchedulePage.jsx`, etc.:

```js
useEffect(() => {
  const channel = supabase
    .channel('event_tasks_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'event_tasks' },
      () => loadAllEventTasks())
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [beos])   // re-subscribe scope consistent with the existing tasks-load effect
```

- Simplest correct approach: on any `event_tasks` change, re-run `loadAllEventTasks()`
  (95 rows, cheap). Avoids hand-merging payloads.
- **Reconciliation:** local optimistic update happens immediately on tap; the realtime
  refetch confirms/overwrites. Because writes are idempotent boolean sets, a refetch that
  lands after the optimistic update is harmless (same value).
- Guard the effect against the FOH read-only / no-BEO cases consistent with the existing
  `[beos]` effect.

**Dependency:** Phase 1 (table must be in the publication). Independent of Phase 3.

---

### Phase 5 — Verification

1. `cd app && npm run build` → clean (only the pre-existing chunk-size warning allowed).
2. **Manual cross-device test (the real acceptance gate):**
   - Open the Events page on two devices/browsers (one office, one kitchen).
   - Tap a task to in-progress on device A → amber appears on device B within ~1–2s.
   - Tap to complete on B → done state appears on A; amber cleared everywhere.
   - Subtask in-progress does **not** change the parent (D6).
   - Completion cascade (parent↔subtasks) still works and clears in-progress.
   - Un-complete → returns to todo (not in-progress).
3. Confirm existing flows untouched: add task/subtask, delete, prep-list generation,
   completion counts (`completedCount/total` badge).
4. *(Optional, per testing rules)* Add a Playwright E2E for the tap cycle if/when an E2E
   harness is set up — the repo currently has no automated test suite, so manual
   multi-device verification is the realistic gate for v1.

---

## 5. Execution Order & Dependency Graph

```
Phase 1 (migration) ─┬─> Phase 2 (data layer) ──> Phase 3 (UI + visuals) ─┐
                     └─> Phase 4 (realtime) ─────────────────────────────┴─> Phase 5 (verify)
```

Phase 1 first and alone (apply + verify). Phases 2→3 are sequential. Phase 4 can be built
in parallel with 2/3 but tested only after Phase 1. Phase 5 last.

## 6. Risks & Notes

- **R1 — Checkbox vs. 3-state overload (Phase 3).** The one open UX call. Recommendation:
  checkbox = done, row/label = in-progress. Confirm with owner before wiring.
- **R2 — Don't touch the completion cascade.** The parent↔subtask completion logic in
  `toggleEventTask` is load-bearing; only *extend* it to clear `in_progress`, never
  refactor its completion behavior. In-progress is strictly non-cascading (D6).
- **R3 — Realtime echo.** Self-triggered updates also fire the subscription; the refetch is
  idempotent so no flicker/loop, but verify the optimistic-update + refetch ordering on a
  slow connection.
- **R4 — `REPLICA IDENTITY FULL`** slightly enlarges WAL for `event_tasks` updates;
  negligible at this table's size, and required for clean realtime payloads.

## 7. Change Log entry (append after implement, per project rule)

`### 2026-06-19 — Event Task "Working On It" State + Realtime` — migration adds
`event_tasks.in_progress` + realtime publication; EventsBanquetsPage gains a 3-state tap
cycle (todo→in progress→done) and a live `event_tasks` subscription; amber in-progress
styling. Anonymous, per-row, non-cascading; parents ignore subtask progress.
