# Session 2026-11-16 — Open Threads list; order guide B Task 5 built

Follows `mem:session-2026-11-15-order-guide-b-tasks-0-4`. Local `main`, NOT pushed (96 ahead of origin/main).

## Open Threads (CHANGES.md, top)
Ryan asked about a HANDOFF.md; decided against it (would duplicate tasks/todo.md + CHANGES.md and go stale). Instead
CHANGES.md opens with "Open Threads": every unfinished item across features. REWRITE it at every /sc:save, re-checking
figures (git rev-list counts, the toISOString grep, worktree/prepsheets). Commits `bc96b82`, `5020df5`.
Found while building it: the Prep Sheets memory still said "waiting on push" (it shipped 11-10/11) — fixed; a Vite
node process survives `TaskStop` — kill it by port 5173 and confirm.

## Task 5 — lines-to-match box (`c2acd29`)
- `components/BeoLineMatcher.jsx`: box + `MatchLine`; reuses `ingredient-picker*`, `catalog-row-meta`, `dish-spec-gap`.
- `beoLines.js`: `linesToMatch(items)` (one per wording, item context, canDescribeAbove), `matchRow(key, kind, dishId)`,
  dish order ties on season.
- `beoOrderData.js`: `saveMatch(row)` upsert onConflict `source_text,under_dish_id` (+ confirmed_at now); fetch adds season.
- Page: `generateOrderItems(beo, { askFirst })`; `matchingFor` state; `buildFromMatcher` → askFirst false.
- 296 tests; 6 mutations caught. Browser with writes blocked via `window.fetch` monkeypatch: Walton Heath box (8 lines,
  no AI call), failed save, search, Cancel, 375px, 0 errors, 0 rows saved.

## Waiting on Ryan
Criteria 1, 2, 4 need his REAL answers (saved for good): near miss (Club Car Wash "Chopped Ceasar Salad"), Walton
Heath (Not on a menu + Describes; check the AI request body), no-AI-call BEO (Edwards "Pumpkin Cinnamon Cheesecake" or
Rusty Drewing "BQT Staff" + timing line). He chooses: answer on the dev server, or give answers in chat.
Offered, not done: show only the line above as context (the box repeats the whole item).
Then T6 Part of / Its own dish, T7 Change match, Checkpoint C, T8.
