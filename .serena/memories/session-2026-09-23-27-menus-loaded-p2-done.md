# Sessions 2026-09-23 → 27 — current menus loaded, P2 DONE

## STATE
- `menu_dishes`: **368 dishes, all confirmed**, 15 menus (in `New Catering and Event Menus 2026/`),
  seasons spring 28 / summer 27 / fall 28 / winter 28 / year-round 257. **4 price rules,
  364 in `orderable_menu_dishes`** — P3's input. `process-menu` **v9** deployed = committed.
- Commits: `477beca` (menus, parser v9, lb + season migrations), `780303e` (docs),
  `db53178` (prompt_test.ts + design-doc superseded note + archive). `main` **27 ahead,
  NOT pushed** (owner's call; live site lacks catalog/menus pages until pushed).
- Owner confirmed the pre-v25 BEO re-check is DONE and passed.

## What v8 got wrong on the real 2026 menus (all fixed in v9)
- **Invented prices**: Breakfast prints 4 prices for 5 sandwiches; v8 stored Ham $6 (not
  on the page; really $8) and gave the unpriced Gouda Croissant $8. Owner set Gouda $9.
- **Themed Buffets**: "Southern BBQ $41" exploded into 8 unpriced components (82 rows).
  Package-is-one-dish rule lived only in the Word path → moved to shared core (rule 10).
  P3 must read package components from `description`.
- No `lb` unit ("$180 / 4lbs" = $180 for 4 of nothing); minimum stored as 24 beside a
  per-dozen price (reads as 24 dozen); "A or B" dishes split inconsistently (owner: split).
- Spring/Summer had no season → would file as year-round "Seasonal - Spring".
- Gemini 503 "high demand" on 10/15 files → v9 retries 503/429 inside the 130s deadline.

## After the owner's confirm pass, three items were STILL wrong
The model **ignored** the station-wide pizza-minimum rule even in v9 (30 per pizza),
"Additional Salad/side/dessert" were confirmed as food (would double-order in P3), and a
stray topping bullet was confirmed as a dish. Fixed in SQL at his instruction.
**Lesson: verify the confirmed ROWS, not the confirm count.** These fixes live only in
data — re-uploading Hors d'Oeuvres would re-create the "Prosciutto, Tomato..." draft.

## Process notes
- Verification chain that worked: parse-only run → v8-vs-v9 diff → spot-check on page →
  deployed-vs-local compare → load via the real path → diff DB against the checked parse.
  A diff keyed by name alone produced false alarms (same name, two sections) — key by
  the table's identity.
- `prompt_test.ts` now in repo; proven by 4 mutations, each failing exactly 2 tests.
- **CRLF trap**: CHANGES.md is CRLF; a script searching `"\n---\n"` moved 4 entries
  instead of 1. Caught by line count, restored from git, redone with a one-entry guard.
- Apostrophes inside single-quoted bash break inline node scripts — write a file instead.

## Next
P3: `dish_ingredients` + `ingredient_products` off the 364 orderable dishes.
Design: `claudedocs/design_beo_order_guide_2026-09-15.md` §5–7.
