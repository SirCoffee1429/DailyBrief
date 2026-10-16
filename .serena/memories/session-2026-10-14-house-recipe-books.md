# Session 2026-10-14 — seasonal recipe books drive the dish drafter (P3)

**Session name:** `house-recipe-books` — CHANGES.md entry "2026-10-14 — Seasonal Recipe Books Drive the Dish
Drafter; Fall Drafted From the Book". To resume: read this memory + that entry, then auto-memory
`project-house-recipe-books`.

**Ask:** continue P3, draft more dishes; owner added `seasonal-recipes/fall_recipe_book/Fall Banquet Recipe Book.pdf`
(no `fall/` subfolder despite what he wrote) as the reference for each season's dishes.

**Owner decisions:** drafter + review page both use the books; buffet entrées = book portion × 0.65 (sides as
written); book ingredients/portions are right, methods not; spring/summer/winter WAIT for their books; the 10
fall dishes the book omits (2 Caesars, garden salad, 7 desserts) stay undrafted.

**Built (all deployed/applied except the page):**
- `house_recipes` table + `house_recipe_key()` + `dish_house_recipes(uuid[])` (migration 20261014000000; applied
  via MCP in two steps — second made the walk search only ON THE PLATE/INGREDIENTS, descriptions point UP).
- `app/scripts/recipe-book-sql.mjs` loader (pdfjs-dist). Fall: 30 recipes loaded; cross-checked vs pypdf 30/30,
  md5 after load matched.
- `draft-dish-specs` v13 → v21: rule 13 (model copies WHOLE batches); code reads shares off the book's lines
  (`bookShare`: own recipe 1/portions, plate side amount / (portions × size), sub-recipe line amount / YIELD ×
  parent); model numbers only as named fallback; sub-recipe lines dropped; lb→oz; subtitle/`&`/accent tolerant
  titles; split-off sections folded into their recipe; zero-rounded amounts named; buffet ×0.65.
- `house_recipe_test.ts` (12 tests, real book text); 21/21 with match/retry; 13 mutations each caught.
- `DishSpecs.jsx` + `index.css`: collapsible book recipe under each spec + in edit form. Build passes;
  **browser check NOT done** (office gate — owner must unlock). Not committed, not pushed.

**Data:** 18 fall dishes drafted (37/37 shares from the book, hand-checked). DB 10-14: 232 confirmed / 39 drafts
(21 plated desserts + 18 fall) / 93 none (all Seasonal). Review items given to owner: chicken heirloom carrots
merged into `carrot`; garlic amount dropped on Short Rib/Pork Loin/Chicken; greens as lacinato kale; Cobb is a
proposed build. Open question: commit or gitignore the PDF.

**Lesson:** `mem:` see auto-memory feedback-model-copies-code-computes — each layer of model arithmetic failed.
Docs: CHANGES.md entry added; 3 oldest entries moved to docs/changelog/2026-09.md + new 2026-10.md (443 lines).

**Completion check 2026-10-15 (`/sc:reflect --type completion --validate`):** re-verified rather than trusted —
deno 21/21, `npm run build` passes, deployed `draft-dish-specs` v21 is line-identical to local `index.ts`, prod
`house_recipes` = 30 fall rows with RLS + 1 policy, `dish_house_recipes` carries the ON THE PLATE/INGREDIENTS filter,
counts 232 confirmed / 39 draft (18 fall + 21 null-season) / 93 none, changelog anchors all resolve. Still open:
browser check of `DishSpecs.jsx`, commit (nothing committed), PDF commit-vs-gitignore, owner review of the 18 fall drafts.
