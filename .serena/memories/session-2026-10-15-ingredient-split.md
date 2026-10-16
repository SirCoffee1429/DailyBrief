# Session 2026-10-15 → 10-16: Ingredient search + Split

## Done
- `/sc:reflect house-recipe-books` completion check (tests 21/21, build, v21 deployed = local).
- Ingredient Products (`app/src/pages/IngredientProducts.jsx`): search box (name/product/dish, all statuses,
  ranked exact name > all words in name > dish-only) and Split (`SplitForm`, key `s`): move ticked dishes'
  `dish_ingredients` lines to another name. Clash refused by dish name; moved count verified; when a FRESH
  count finds no dish left on the old name, its match is renamed (brand-new target) or deleted (existing target).
- Data on prod: `egg patty` 4 → #955042; `egg` 77 → #518048 (white shell eggs); `eggs` gone; orphans
  `peanuts`, `raisins` deleted (owner) — 0 orphan matches.
- Verified in browser + SQL: egg split, clash refusal, `baked beans` whole-name round trip (match carried, only
  updated_at changed).
- Commits (NOT pushed; main ahead of origin): `f93b9d4` house recipe books (+ PDF gitignored), `626f9ee` search/Split,
  then the session-save docs commit.

## Open
- Not checked: phone width; a dish drafted onto the old name while the form is open (code-read only).
- Owner review of the 18 fall drafts; browser check of the DishSpecs book-recipe panel.
- Uncommitted on purpose: `supabase/.temp/cli-latest`, Vendor Data worksheet,
  `.serena/memories/session-2026-09-27-schedule-week-redate.md` (owner to decide).
- Pushing main = owner's call (would make Catalog/Menus/Dish Ingredients/Ingredient Products live).
