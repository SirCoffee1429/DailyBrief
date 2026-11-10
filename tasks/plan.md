# Implementation Plan: Station Prep Sheets

Spec: `spec/prep-sheets.md` (approved 2026-11-04). Task list: `tasks/todo.md`.

## Overview

Five station prep sheets become one running list per station: on-hand vs par, an automatic Red/Yellow/Green, a to-prep
amount, Done/Partial, notes and Finish count, all updating live. The office gets a ranked overview, setup editing and a
spreadsheet upload, and the Kitchen dashboard gets a tile. Built on its own branch off `origin/main` and shipped alone.

## Architecture Decisions

- **Ship branch + worktree.** Branch `prep-sheets` off `origin/main`, checked out in a separate worktree
  (`../DailyBrief-prep-sheets`), so local `main`, its 74 unpushed commits and `prepsheets/` are never touched. The worktree
  gets its own `node_modules` via `npm ci` from the LIVE lockfile, so the build and browser check run on exactly what
  Vercel will build.
- **Every write goes through a Postgres function (RPC), one transaction each:**
  - `prep_record(item, kind, amount, note, employee)` handles `count` (set have), `done` (have = par), `partial`
    (have += amount) and `note`. It updates `prep_item_state` and appends to `prep_entries` together, so a partial adds
    to the CURRENT value even if two cooks tap at once.
  - `prep_finish_count(station, label, employee)`.
  - `prep_replace_station(station, items jsonb)` does the upload. It matches items by name so their state survives, and
    retires items that are gone, which keeps their history.
  - Reads are plain selects. This is the existing anon-access pattern (event tasks), RLS on, anon policies created in the
    same migration.
- **Retire, don't delete.** Removed items and stations get `active = false`, so history never points at nothing.
- **Pure logic in `lib/prepSheets.js`, tested:** `parsePar`, `colorFor`, `toPrep`, `quickValues`, `stationScore`,
  `parsePrepRows`, plus the typo map. Components only call it, so the math on screen is the math the tests checked.
- **Par storage:** `par_qty numeric` + `par_unit text` + `par_text text` (original, for display). `par_qty` is null when
  there's no par, which means no color and no score.
- **Live updates:** `prep_item_state` and `prep_counts` are added to the `supabase_realtime` publication. The sheet,
  overview and tile subscribe and reload on change (same pattern as `event_tasks_changes`).
- **Who:** the dropdown reads `employees` (active, by name). The last pick is kept in `localStorage` under
  `prepSheets.employeeId`. It's a name id, not a token, so rule 12 (no JWT stored) isn't touched.
- **Merge-friendly edits:** styles live in `app/src/prepSheets.css`, imported by the prep pages. `App.jsx`,
  `KitchenLayout.jsx`, `OfficeLayout.jsx` and `Dashboard.jsx` each get a few added lines only. Local `main` changes
  `App.jsx` (+8), `OfficeLayout.jsx` (+16) and `index.css` (+381), so a small conflict on the merge back is possible and
  gets resolved by hand.

## Dependency Graph

```
lib/prepSheets.js (+ tests)
        │
migration: tables, RLS, realtime, RPCs ──(Ryan's OK to apply to prod)
        │
Office Prep Setup: upload + preview + confirm ──→ load the five Fall 26 sheets (Ryan's OK, prod data)
        │
Kitchen station sheet: count / quick buttons / color / to-prep / name
        ├── Done, Partial, note, Finish count
        ├── live updates
        │
        ├── Office Prep Overview (ranked, live)
        ├── Kitchen dashboard tile (live)
        └── Office Setup item editing
        │
Review → push prep-sheets:main (Ryan's OK) → merge back into main → CHANGES.md
```

## Task List

See `tasks/todo.md` for full acceptance criteria. Phases:

1. **Foundation:** T1 logic, T2 sheet parser, T3 migration. *Checkpoint A.*
2. **Data in:** T4 upload page + load the five sheets. *Checkpoint B.*
3. **Crew flow:** T5 station sheet, T6 Done/Partial/note/Finish count, T7 live. *Checkpoint C (phone-width cook flow).*
4. **Manager + polish:** T8 overview, T9 dashboard tile, T10 setup editing. *Checkpoint D (all success criteria).*
5. **Ship:** T11.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Local dev writes to the LIVE DB | High | Tests use a throwaway station named `ZZ Test`, retired after; the five real stations are only loaded once in T4 on Ryan's OK |
| A blank-par row is a section OR an item, with no signal in the file | Med | Section only if the next line has a par (Fall 26: 1 flip left, Citrus Vinaigrette); every blank-par row has a Section/Item toggle in the preview |
| Par text the parser misreads (e.g. `2 1/3 pans`) | Med | Tests cover every par in the five real files; the upload preview flags anything unparsed; nothing saves without confirm |
| Merge back into `main` conflicts | Low | Own CSS file, a few added lines in shared files, merge (not rebase) |
| Vitest isn't on the live branch | Med | See Open Question 1 |
| Old SheetJS 0.18.5 on the ship branch | Low | Office-only upload of its own files; the next full `main` push brings 0.20.3 |
| Realtime events fire per row on an upload | Low | Subscribers reload the whole station once per event, and a replace is one RPC on a ~60-row list |

## Open Questions (need Ryan before T1)

1. **Tests on the ship branch.** Vitest was added in an unpushed commit. Options:
   - **(Recommended)** Add the same `vitest` devDependency and `"test"` script to the ship branch. That's an install, so
     it needs your OK. It never reaches the browser bundle, and on the merge back local `main`'s `package.json`/lockfile
     win, since they already have it.
   - Or don't: run the tests from local `main`'s checkout against a copy of the branch's file. No install, but the test
     isn't run where the code ships.
2. **Commit the five `prepsheets/` files?** The parser test needs them. I'd commit them as `prepsheets/` (136 KB, no
   personal data, just items and pars) on the ship branch. Otherwise the test reads a committed JSON copy of their rows.
3. **`npm ci` in the worktree** installs the LIVE lockfile's packages into the new folder. No package versions change.
   OK?
