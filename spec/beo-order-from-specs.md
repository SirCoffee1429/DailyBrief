# Spec: BEO Order List From Confirmed Dishes (order guide step B)

Status: **Approved by Ryan 2026-11-12.** Plan: `tasks/plan.md`, tasks: `tasks/todo.md`. Builds on step A (`4cb71d8`, on local `main`, not
pushed). History: `claudedocs/design_beo_order_guide_2026-09-15.md` (§ per-BEO path, `beo_dish_matches`),
CHANGES.md 10-25 → 10-26.

## Objective

Today "Generate from BEO" sends the whole BEO to Gemini, which invents its own dish and ingredient names on every
run ("unsalted butter" one time, "butter" the next). Step A then looks up a product for each invented name, and
some miss.

Step B builds the order list from **what you already confirmed**:

```
BEO line ("Tiny Tinga Taco")
  → confirmed dish (Tiny Tinga Tacos, Hors d'Oeuvres)          ← matched ONCE per wording, remembered
  → that dish's confirmed ingredient lines (dish_ingredients)
  → each ingredient's confirmed product (ingredient_products)  → #number · description · pack · $/case
```

**User:** Ryan and the office, on the Events page's order list (office only, as today).

**Products only.** The list shows which products to order, not how many cases. Case counts need the parked case
yields (`claudedocs/design_p4_case_yield_2026-10-25.md`).

### Measured on the 21 live BEOs (11-11, read-only)

- 108 distinct lines in food categories. 16 equal a dish name exactly. 7 are plain notes ("20 pieces",
  "Serves 20", "$20").
- Near misses need a person: "Tiny Tinga Taco" vs "Tiny Tinga Tacos", "Raspberry Baked Brie Bites" vs "Raspberry &
  Baked Brie Bites", "Seasonal Chopped Fruit Platter" vs "Seasonal Chopped Fruit".
- One BEO item can hold several dishes, one per line (Club Car Wash Buffet: tenderloin, mashed potatoes, mac n
  cheese, Caesar, cheesecake). Matching is **per line**, not per item.
- Custom menus match no dish: dinner clubs (Autumn Bitter Greens Salad, Roasted Airline Chicken), member events
  (Vodka Rigatoni), "Course One" with nothing under it.

### Behaviour

**1. Splitting a BEO into lines.** Every non-empty line of every item's description, in every category, except
beverage categories (the keyword list `generate-order-items` already uses, copied into the app). A line is compared
after normalising: lowercase, spaces collapsed, ends trimmed.

**2. What happens to each line.** A BEO is read item by item.

**(a) The item's FIRST line is a menu dish** (a saved match or an exact name). The whole item is that dish. Its
other lines are its description: they are shown in grey under the dish (rule 4) and are not matched or sent to the
AI. Examples: "With Herbed Parmesan, Red Pepper Coulis" under Bacon-Wrapped Scallops, and the component list under
Build Your Pasta Bar. One exception, because two dishes are sometimes typed into one item (Ryan, 11-12: rare):

- A line under the dish that is **itself exactly an orderable dish name** is asked once: **"Part of <dish>"** or
  **"Its own dish"**. The answer is remembered for that pair. Caesar Salad under Build Your Pasta Bar → Part of
  (the Pasta Bar spec already holds romaine, Caesar dressing and croutons). Caesar Salad on its own elsewhere is
  unaffected.
- Limit: only exact names are caught. "Caprese Skewers" (with an s) typed under Bruschetta would stay hidden in
  the grey lines.

**(b) Otherwise, each line on its own**, in this order:

| Line | Result | Asked? |
|---|---|---|
| Already decided (a `beo_dish_matches` row) | That decision | No |
| A plain note: `N pieces/each/orders`, `Serves N`, a `$` price | Skipped | No |
| Equals the name of exactly ONE orderable dish | That dish | No |
| Anything else | **To match** | Yes, once |

The "Club Car Wash Buffet" item shows why (b) goes line by line: tenderloin, mashed potatoes, mac n cheese,
vegetables, Caesar and cheesecake are separate dishes in one item, under a heading that is not a dish.

**3. Matching (on the order list).** When Generate finds lines still to match, it shows them at the top of that
BEO's order list, before building anything. Each line shows its BEO item for context and offers:

- **Suggested dishes:** up to 3 orderable dishes sharing the most words with the line (plain code, no AI). Each
  shows its menu and section, because the same name sits on two menus (Yogurt Parfait Bar ×2, Angel Food Cake ×2).
- **Pick another dish:** a search over all 364 orderable dishes.
- **Not food:** "BQT Staff", "Orders taken by server", "Track costs for transfer please", a heading like "Club
  Car Wash Buffet".
- **Not on a menu:** a real dish with no menu entry (Vodka Rigatoni, Roasted Airline Chicken). The AI breaks it
  down (rule 5).
- **Describes the line above:** "Radicchio & Endive, Warm Bacon Vinaigrette, Candied Pecans, Shaved Pecorino" under
  Autumn Bitter Greens Salad. It goes wherever the line above goes: to the AI with it, or grey under its dish.

Each answer is saved at once to `beo_dish_matches` and used for every future BEO with the same wording. **Build
list** is always available; lines still unanswered are treated as "Not on a menu" this time and not saved.

**4. Building the list.** One group per dish, as today, with the dish name as the group heading. **Under the heading,
in small grey text, the BEO's own lines for that dish** (the matched line and its description lines), so a
one-event change shows at a glance. Example: the Mid Mo Mahjong Pasta Bar's lines beside a category note that says
"Please have GF noodles available". Then the dish's confirmed ingredient names, each with its product (step A's
line: number, description, brand, pack, $/case, last bought) or "No catalog product". A dish that appears twice in
a BEO shows once. Only dishes with `spec_status = 'confirmed'` build from the spec. A matched dish without one is
treated as "Not on a menu".

**B follows the menu's spec, not the BEO's wording.** A swap for one event (pesto for marinara, GF noodles) is
not on the list. The grey lines are there so you see it, and you add it by hand as today.

**5. AI guess for the rest.** Lines answered "Not on a menu" (or unanswered), together with any lines that describe
them, go to the existing `generate-order-items` function. Only those lines are sent, so the AI never re-breaks a dish
the spec already covers. Its rows get the step-A product lookup, as today, and are **labeled "AI guess"** on the
list. No AI call when every line is covered.

**6. Regenerate** behaves as today: generated rows (spec and AI) are replaced, hand-added rows stay. A product picked
by hand on a generated row is lost on regenerate, which is unchanged from step A.

**7. Fixing a match.** Each spec-built group shows the BEO line it came from. **Change match** reopens that line's
choices, and the new answer replaces the saved one. Regenerate to apply it.

### Not in scope

Case counts or quantities. The BEO's qty column on the list. A page listing every saved match. Editing dish specs
or ingredient products from the order list. Changes to `generate-order-items` or any other Edge Function.
Kitchen or FOH views.

## Tech Stack

React 19 + Vite (`app/`), Supabase JS client, Vitest 5.1.0. Postgres on Supabase `chajwmoohmiugdgvqjyo`. No new
packages.

## Commands

```
Test:   cd app && npm test
Build:  cd app && npm run build
Dev:    cd app && npm run dev          # http://localhost:5173, LIVE database
```

## Project Structure

```
supabase/migrations/2026111x_beo_dish_matches.sql  → new table + policies; event_order_items.ai_guess + beo_text
app/src/lib/beoLines.js           → pure: split BEO → lines, normalise, first-line-dish rule, plain-note rule,
                                     exact-name match, "describes the line above", word-overlap suggestions
app/src/lib/beoLines.test.js      → fixtures from the real BEOs listed above
app/src/lib/beoOrderList.js       → pure: decided lines + specs + products → order rows (spec rows, AI-line list)
app/src/lib/beoOrderList.test.js
app/src/components/BeoLineMatcher.jsx → the "lines to match" box (suggestions, dish search, Not food, Not on a
                                         menu, Describes the line above, Part of / Its own dish)
app/src/pages/EventsBanquetsPage.jsx  → generateOrderItems() calls the above; grey BEO lines; "AI guess" label;
                                         Change match
```

`EventsBanquetsPage.jsx` is already 2,115 lines, so new UI goes in its own component and the logic in `lib/`.

### Data

```sql
beo_dish_matches (
  id            uuid primary key default gen_random_uuid(),
  source_text   text not null check (btrim(source_text) <> ''),  -- the normalised line
  under_dish_id uuid references menu_dishes (id) on delete cascade,
                                                  -- set only for a dish-name line found under another dish (2a)
  kind          text not null check (kind in
                  ('dish', 'not_food', 'not_on_menu', 'describes_above', 'part_of_dish')),
  dish_id       uuid references menu_dishes (id) on delete cascade,
  confirmed_at  timestamptz not null default now(),
  unique nulls not distinct (source_text, under_dish_id),
  check ((kind = 'dish') = (dish_id is not null)),
  check (kind <> 'part_of_dish' or under_dish_id is not null),
  check (under_dish_id is null or kind in ('dish', 'part_of_dish'))  -- under a dish: only the two answers 2a offers
)
-- applied 2026-11-15: supabase/migrations/20261115162620_beo_dish_matches.sql
-- anon + authenticated policies in the SAME migration (ensure_rls switches RLS on)

event_order_items.ai_guess boolean not null default true
-- default TRUE, so every existing row and every row the LIVE site's Generate writes before main is pushed counts
-- as AI. Only B's spec-built rows set false. The label shows on non-manual rows only.
event_order_items.beo_text text
-- the BEO's own lines for the group (rule 4's grey text; Change match reads its first line)
```

`on delete cascade`: if a menu is re-ingested and a dish disappears, its matches go with it and the line is asked
again, never pointed at nothing. `nulls not distinct` (as on `menu_dishes`) keeps one standalone answer per line.

## Code Style

Match the page: plain functions, a `//` comment above each block, Supabase errors checked, never ignored
(`reference-supabase-silent-wrong-data`).

```js
// The dishes a BEO line could be, best first: most shared words, ties by name.
// Plain code, not AI: the near misses on real BEOs are all word overlaps
// ("tiny tinga taco" vs "tiny tinga tacos").
export function suggestDishes(line, dishes, limit = 3) {
    const words = wordSet(line)
    return dishes
        .map(dish => ({ dish, shared: overlap(words, wordSet(dish.name)) }))
        .filter(s => s.shared > 0)
        .sort((a, b) => b.shared - a.shared || a.dish.name.localeCompare(b.dish.name))
        .slice(0, limit)
        .map(s => s.dish)
}
```

## Testing Strategy

- **Vitest, tests first** for `beoLines.js` and `beoOrderList.js`. Fixtures are the real BEO lines above: rules 2a and
  2b, the duplicate-name dishes, the Pasta Bar's component lines (with Caesar Salad asked as Part of / Its own
  dish), the Club Car Wash multi-dish item (a dish mid-item must NOT hide the lines after it), the dinner club
  salad + its description line, and "Course One".
- **Determinism (the design doc's P4 gate, products-only):** building the same BEO twice with the same saved
  matches gives byte-identical spec rows. The test calls the shipped `beoOrderList.js`, not a copy. Checked by
  mutation: break the first-line-dish rule and the test must fail.
- **Browser (Claude in Chrome):** on a real BEO, match lines, build, regenerate, Change match, the "AI guess"
  label, 375px. Writes go to the live database, so test matches are made only with Ryan's OK and removed after.
- Gate per task: `npm test` + `npm run build` + browser check.

## Boundaries

- **Always:** take products only from CONFIRMED `ingredient_products` rows and ingredients only from confirmed specs;
  leave hand-added rows alone; check every Supabase `error`; keep the per-BEO spec path free of AI.
- **Ask first:** applying the migration on prod; any change to `generate-order-items` or another Edge Function;
  pushing; writing or deleting live matches while testing.
- **Never:** loosen the exact-name rule to "contains" or "starts with"; guess a dish when the line is ambiguous; let
  the order list change a dish's spec or an ingredient's product for every dish (step A's rule: a hand pick is that
  BEO's row only).

## Success Criteria

1. Celebration of Life: after Tiny Tinga Taco, Raspberry Baked Brie Bites and Watermelon, Feta & Grape Tomato
   Skewer are matched once, Generate builds them from their confirmed specs. Every ingredient with a confirmed
   product shows it.
2. Generate on a second BEO with the same wording asks nothing for those lines.
3. Mid Mo Mahjong: Build Your Pasta Bar is built from its spec. Its component lines show in grey under it and are
   not AI-broken. Only Caesar Salad is asked, once (Part of / Its own dish).
4. Walton Heath Dinner Club: lines answered "Not on a menu" appear under an "AI guess" label, each sent to the AI
   with its "Describes the line above" lines. Lines answered "Not food" appear nowhere.
5. Regenerate twice: spec-built rows are identical. Hand-added rows survive.
6. A BEO whose lines are all decided and on a menu makes no AI call.
7. `npm test` and `npm run build` pass, no console errors, readable at 375px.

## Decisions (Ryan, 2026-11-12)

- **Exact-name auto-match: yes.** A line equal to exactly one orderable dish name is used without asking.
- **Beverage keywords: copied** into the app. `generate-order-items` is not changed or redeployed. The copy matches
  WHOLE words: the function's substring check would drop a "Steak Dinner" category ("tea" is in "steak") or
  "Barbecue Buffet" ("bar"). No current BEO has one.
- **Shipping: with main's backlog.** B is built on local `main` beside A and ships whenever main is pushed. No
  ship branch.
- **Grey BEO lines under each spec-built dish: yes** (rule 4).
- **Two dishes in one BEO item happens, rarely:** a dish-name line under another dish is asked once, Part of / Its
  own dish (rule 2a).

## Open Questions

None.
