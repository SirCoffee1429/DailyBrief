# Implementation Plan: BEO Order List From Confirmed Dishes (order guide step B)

Spec: `spec/beo-order-from-specs.md` (approved 2026-11-12). Task list: `tasks/todo.md`.
The prep sheets plan that lived here is complete and moved to `tasks/archive/prep-sheets-plan.md` / `-todo.md`.

## Overview

"Generate from BEO" stops asking Gemini to invent the whole list. Each BEO line is matched once to a confirmed menu
dish, or marked not food, not on a menu, or describing the line above. The answer is remembered. Matched dishes
build from their confirmed ingredient lines and confirmed products. Only lines that are not on a menu still go to
the AI, labeled "AI guess". Products only, no case counts. Built on local `main` beside step A; ships with main's
backlog (Ryan, 11-12).

## Architecture Decisions

- **Logic in pure `lib/` modules, tested first; the page only wires them.** `beoLines.js` decides what each line
  is. `beoOrderList.js` turns decided lines + specs + products into rows. `EventsBanquetsPage.jsx` is already 2,115
  lines, so the matcher UI is its own component.
- **DB reads stay small and filtered.** `dish_ingredients` has ~2,700 rows (over the 1,000-row PostgREST cap), so
  ingredients are fetched with `.in('dish_id', matchedIds)` for one BEO, never all at once. Matches are fetched by
  `.in('source_text', lines)`. The 364 orderable dishes (for exact names and suggestions) fit in one read, and the
  read checks its count (`reference-supabase-silent-wrong-data`).
- **Products reuse step A's `productsForItemNames`.** Spec names are `ingredient_products` keys, so its exact form
  hits first.
- **The AI part needs no Edge Function change.** `generate-order-items` takes `sections`, so B sends synthetic
  sections holding only the not-on-a-menu lines (plus their "describes the line above" lines). No lines, no call.
- **`ai_guess` defaults to TRUE** (spec Data). The migration goes live before main is pushed, and the live site's
  Generate keeps writing AI rows in between. Default true labels them correctly with no backfill. B's spec rows
  set false.
- **Vertical order:** the build path works end to end (Task 4) before the matcher exists. Lines without an answer
  already fall back to "AI guess this time" (spec rule 3), so each later task adds a way to answer them.

## Dependency Graph

```
T1 beoLines.js (classify) ──┐
T2 suggestDishes ───────────┤
                            ├─→ T4 Generate builds from specs (page + grey lines + AI label)
T3 beoOrderList.js ─────────┤        │
M  migration (Task 0) ──────┘        ├─→ T5 matcher box ─→ T6 Part of / Its own dish
                                     │                  └─→ T7 Change match
                                     └────────────────────→ T8 review
```

## Task List

### Phase 1: Foundation (pure logic + table)
- [x] Task 1: `beoLines.js`: split, normalise, classify (test first)
- [x] Task 2: `suggestDishes` + dish search filter (test first)
- [ ] Task 3: `beoOrderList.js`: decided lines → rows (test first)
- [ ] Task 0 (any time before Task 4): migration, reviewed with Ryan, applied with his OK

### Checkpoint A
- [ ] T green · B green · migration live and checked by SELECT · live site unaffected

### Phase 2: The path end to end
- [ ] Task 4: Generate builds from confirmed specs; grey BEO lines; "AI guess" label

### Checkpoint B (Ryan)
- [ ] On real BEOs: exact-name dishes from their specs, the rest AI-labeled, regenerate identical

### Phase 3: Answering lines
- [ ] Task 5: The "lines to match" box (5 answers, saved, Build list)
- [ ] Task 6: Part of / Its own dish for a dish name under a dish
- [ ] Task 7: Change match on a spec-built group

### Checkpoint C (Ryan)
- [ ] Spec success criteria 1–7 walked through on real BEOs

### Phase 4: Finish
- [ ] Task 8: `/review-change`, docs, CHANGES.md. No push (ships with main)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A rule hides a real dish (first-line rule mid-item, too-wide plain-note pattern) | High: nothing ordered for it | Fixtures from the real BEOs, incl. Club Car Wash; mutation-check the first-line rule; grey lines keep hidden text visible |
| 1,000-row cap silently truncates ingredients or dishes | High: missing lines, no error | Filtered reads; the dish read asserts its count; check every `error` |
| Answers made while testing are REAL data (the table is the live cache) | Med | Ryan gives the real answers in the browser checks (that's the real use). Any made-up test answer only with his OK, deleted after |
| AI given only the custom lines loses context it had before | Low | Send each line with its "describes the line above" lines and its category name; compare against today's output on Walton Heath |
| `EventsBanquetsPage.jsx` grows further | Low | Logic in `lib/`, UI in `BeoLineMatcher.jsx`; page changes limited to wiring + rendering |
| Live site writes rows between migration and push | Low | `ai_guess default true`; B's new columns are nullable/defaulted, live code ignores them |

## Open Questions

None. The spec's are answered (Decisions, 11-12).
