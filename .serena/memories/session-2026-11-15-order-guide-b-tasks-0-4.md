# Session 2026-11-12 → 11-15 — Order guide step B, Tasks 0–4 + Checkpoints A/B

Spec `spec/beo-order-from-specs.md` (approved 11-12). Plan/tasks `tasks/plan.md`, `tasks/todo.md` (Tasks 0–4 [x],
Checkpoints A/B [x]). Everything on local `main`, NOT pushed.

## Commits
- `72a132d` spec + prep-sheets plan archived · `84eb733` T1 classify · `147f4d8` T2 suggest/search · `4540f04` T3 rows
- `bab888a` T0 migration (`supabase/migrations/20261115162620_beo_dish_matches.sql`, applied prod 16:26 UTC, Ryan OK)
- `b5d50b6` T4 Generate from specs · `008d5c6` Checkpoint B (Ryan: Club Car Wash "everything looks good")

## Code map
- `app/src/lib/beoLines.js`: normaliseLine, isBeverageCategory (whole words), isPlainNote, classifyBeoLines (kinds: dish,
  description, ask_part_of, note, not_food, not_on_menu, describes_above, to_match), suggestDishes, searchDishes, beoLineKeys.
- `app/src/lib/beoOrderList.js`: matchedDishIds, buildOrderList → {specRows, aiSections}, generatedRows (AI groups after spec groups).
- `app/src/lib/beoOrderData.js`: fetchOrderableDishes / fetchSpecLines (count-checked vs 1000 cap), fetchSavedMatches
  (chunked 100), replaceGeneratedRows (delete+insert, errors checked).
- `EventsBanquetsPage.jsx` generateOrderItems wired; render: grey `beo_text` (pre-line) + amber "AI guess" tag.
- Tests: 288 (beoLines 67, beoOrderList 17 incl. new). Mutations: T1 3, T2 4, T3 6, T4 5 — all caught.

## Live state
- `beo_dish_matches` empty; `event_order_items.ai_guess` default TRUE, `beo_text`.
- Generated lists (new code) left on American Outdoor Brands + Club Car Wash.
- Ryan deleted old BEOs 11-15 (Celebration of Life, Mid Mo Mahjong gone) → order rows cascade.

## Next
`/build task 5`: `components/BeoLineMatcher.jsx` lines-to-match box; + live "no AI call" check (moved from T4).
Then T6 Part of / Its own dish, T7 Change match, Checkpoint C, T8 review + docs. Test answers = live data → Ryan's OK.
Same-name dishes (Yogurt Parfait ×2): merge only if two different wordings map to each — left as is.
