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

## 10-17 follow-up
- Owner finished review: 345/364 confirmed, 19 drafts (all From the Bakery plated desserts), 0 unspecced;
  373 ingredient names all confirmed (48 not from catalog), 0 orphans.
- Spring/summer/winter (83) specced WITHOUT books — owner: redraft each season from its book when it arrives.
- Fall Pork Loin still lacks its 1 Tbsp minced garlic line (tiny; left as is).

## 10-17 `/sc:reflect P3 --type completion --validate`
- Data complete: 364/364 confirmed, 0 without lines/basis, 373 names all confirmed + mapped, 0 orphans, 0 dangling products.
- Design-doc P3 gate ("three dishes hand-checked against the arithmetic") had never been recorded. Ran shipped
  `specCost` vs hand math: Bearnaise $0.9559/guest, House Cookies $4.1133/dozen, Cubed Cheese & Crackers $17.6807/tray — match.
- Of 2,693 lines: 2,022 exact, 446 cross-class gaps, 143 not-from-catalog (48 names), 45 pack-count (P4 bug), 36 no pack total, 1 unpriced.
  Only 78 of 364 dishes cost fully today — the P4 per-mapping conversion is the bulk of the remaining work.
- Mapping questions for the owner (all owner-confirmed, may be deliberate): `cheddar cheese` (14 lines: mac, soup,
  sandwiches) and `pepper jack cheese` → CUBED variety pack #1006778; `swiss cheese` → cubed variety #2873 (no swiss in it);
  `gala apple` → FUJI while `honeycrisp apples` → GALA; `rack of lamb` → boneless leg; `hot dog`/`hot dogs` → different franks.
- 10-18 resolved. Owner: split the tray onto `cubed cheddar/pepper jack/swiss cheese`, both apples → GALA #950172.
  Me (owner's call): `hot dogs` → `hot dog` (#970396 4/1, the only 4/1 frank), `rack of lamb` → not from catalog,
  `monteray jack`/`monteray jack cheese`/`monetary jack blend` → `monterey …` (the last merged into `monterey jack blend`).
  10-19 owner: `cheddar cheese` → shredded #158814 (10 dishes); `cheddar cheese slices` merged into `cheddar cheese slice` (6).
  STILL on the cubed variety pack #1006778: `pepper jack cheese` (Tinga Tacos, Pepper Jack bagel) — owner to re-pick.
- 10-19 `/sc:save`: CHANGES.md 497 → 423 (10-06/07/08 moved verbatim to `docs/changelog/2026-10.md`).

## Open
- Not checked: phone width; a dish drafted onto the old name while the form is open (code-read only).
- The 19 plated-dessert drafts; browser check of the DishSpecs book-recipe panel.
- `.gitignore` covers only the fall PDF — widen to `seasonal-recipes/*/*.pdf`? (asked, unanswered)
- Uncommitted on purpose: `supabase/.temp/cli-latest`, Vendor Data worksheet,
  `.serena/memories/session-2026-09-27-schedule-week-redate.md` (owner to decide).
- Pushing main = owner's call (would make Catalog/Menus/Dish Ingredients/Ingredient Products live).
