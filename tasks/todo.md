# Tasks: BEO Order List From Confirmed Dishes (order guide step B)

Spec `spec/beo-order-from-specs.md` · Plan `tasks/plan.md` · Built on local `main`, ships with main's backlog (no
push in this plan). `/build` does ONE task, then stops.

Verification shorthand: **T** = `npm test` in `app/` · **B** = `npm run build` in `app/` · **C** = browser check with
Claude in Chrome (`npm run dev`, LIVE database; office gate unlocked by Ryan).

## Phase 1: Foundation

## Task 0: Migration `beo_dish_matches` + `event_order_items.ai_guess` / `beo_text`

**Description:** `supabase/migrations/<timestamp>_beo_dish_matches.sql`, exactly the spec's Data section: the table
with its 5 kinds, `under_dish_id`, `unique nulls not distinct (source_text, under_dish_id)`, both checks, `on delete
cascade` to `menu_dishes`; anon + authenticated policies in the SAME migration; `ai_guess boolean not null default
true` and `beo_text text` on `event_order_items`. Additive only.

**Acceptance criteria:**
- [x] SQL reviewed with Ryan, then **applied to prod only with his OK**.
- [x] Checked by `SELECT`: table, constraints and policies exist; `event_order_items` rows all read `ai_guess = true`.
- [x] As anon, inside a rolled-back transaction: insert one row per kind, and the two checks and the unique key
      refuse bad rows. 0 rows kept.

**Done 2026-11-15**: `supabase/migrations/20261115162620_beo_dish_matches.sql`, applied 16:26 UTC with Ryan's OK.
Two checks beyond the spec, both now in it: `source_text` not blank; under a dish only `dish`/`part_of_dish`. SELECT:
RLS on, 9 constraints, 2 policies, 29/29 order rows `ai_guess = true`. Anon rolled-back test: 7 good rows (each kind,
pair + standalone side by side), 10 bad refused (2 unique, 7 check, 1 foreign key), update/delete work, 0 kept.
Live order list: 8 loads after the migration, all 200.
NB: the 29 order rows were gone by 17:20. Logs: 4 BEOs deleted from the office page (Delete button, 17:18 UTC) right
after a packet was approved; order rows cascade with their BEO. The migration only adds, so not it.

**Verification:** SQL checks above · the live order list still loads and generates (read-only look)

**Dependencies:** none (must be live before Task 4) · **Files:** the migration · **Scope:** S

## Task 1: `lib/beoLines.js`: split, normalise, classify (test first)

**Description:** Pure functions over a BEO's `sections`: split every item description into lines, skipping
beverage categories (keyword list copied from `generate-order-items`); `normaliseLine`; and `classifyBeoLines(sections,
dishes, decisions)` → per item, per line: `dish` (with id, and whether by saved answer or exact name), `description
of <dish>` (rule 2a, grey), `ask_part_of` (a dish name under a dish, no saved pair answer), `note` (plain-note
pattern), `not_food`, `not_on_menu`, `describes_above`, or `to_match`. Saved answers win; an exact name counts only
if exactly ONE orderable dish has it.

**Acceptance criteria:**
- [x] Real-BEO fixtures pass: Celebration of Life (description lines grey, "20 pieces" a note), Bagels Bar /
      Pasta Bar (components grey, Caesar Salad → `ask_part_of`), Club Car Wash (heading + six lines each on their
      own — a matched line mid-item hides nothing), Walton Heath (salad + description), Yogurt Parfait Bar (two
      dishes share the name → `to_match`), "Course One" (`to_match`).
- [x] Beverage categories matched by WHOLE word: "Bar Services", "Beverage Services", "Bartending: Open Bar…"
      skipped; a made-up "Steak Dinner" / "Barbecue Buffet" kept (the function's substring check would drop them:
      "tea" is in "steak"). The Edge Function itself is not changed.
- [x] Saved answers apply, incl. a pair answer (`under_dish_id`) and `describes_above`.
- [x] Mutation check: breaking the first-line rule fails tests.

**Done (11-12):** 51 tests; mutation check: a dish on ANY line → 3 fail, no first-line rule → 7 fail, substring
beverage match → 3 fail. Details the spec left open, decided in code (comments in `beoLines.js`):
- Under a first-line dish (2a), "20 pieces" is grey description like the other lines; it is a `note` only in
  line-by-line items (2b).
- "Describes the line above" skips notes to find its line; a chain hangs on the first real line; with no line above
  it goes to the AI on its own (`not_on_menu`), so nothing is lost.
- A pair answer is used only under that dish; a standalone answer never answers a pair.

**Verification:** T (new `beoLines.test.js`) · B · **Dependencies:** none
**Files:** `app/src/lib/beoLines.js`, `app/src/lib/beoLines.test.js` · **Scope:** M

## Task 2: `suggestDishes` + dish search (test first)

**Description:** In `beoLines.js`: word-overlap suggestions (top 3, ties by name, light plural/punctuation
normalising) and `searchDishes(query, dishes)` for "Pick another dish".

**Acceptance criteria:**
- [x] Top suggestion is right for: Tiny Tinga Taco → Tiny Tinga Tacos; Raspberry Baked Brie Bites → Raspberry &
      Baked Brie Bites; Watermelon, Feta & Grape Tomato Skewer → Watermelon, Feta, & Tomato; Seasonal Chopped
      Fruit Platter → Seasonal Chopped Fruit (Platters) in the top 3.
- [x] A line sharing no word gets no suggestions; "&", "with", "and" don't count as shared words.

**Done (11-14):** 14 tests, run against all 364 real dish names (`beoLines.dishNames.fixture.js`); all four near
misses come out FIRST, not just top 3. Accents fold ("Creme Brulee" finds Crème Brûlée), apostrophes drop
("Crostini's"). Stop words: and, with, of, the, a, on, in, or. Search = every typed word starts a word of the dish
name (names only, not menus). Mutation check: no accent fold / no stop words / no plurals / no ranking → 1 / 1 / 1 /
5 tests fail.

**Verification:** T · B · **Dependencies:** Task 1 (same file) · **Files:** `beoLines.js` + test · **Scope:** S

## Task 3: `lib/beoOrderList.js`: decided lines → rows (test first)

**Description:** Pure. Input: classified lines (Task 1), the confirmed specs for the matched dishes, the
product map. Output: (a) spec rows `{ item_name, source_dish, product_id, beo_text, ai_guess: false, sort_order }`,
one group per dish (a dish twice in a BEO → once), dishes whose spec isn't confirmed moved to (b); (b) the AI
payload: synthetic `sections` holding only not-on-a-menu / unanswered lines, each with its describes-above lines
and category name, or `null` when there are none.

**Acceptance criteria:**
- [x] Pasta Bar fixture → its 15 ingredients in spec order, `beo_text` = the item's lines, products from the map.
- [x] Same input twice → deep-equal output (determinism; calls the shipped module).
- [x] Walton Heath fixture → AI payload holds the salad with its description line, nothing spec-built; a BEO
      fully on menus → payload `null`.

**Done (11-15):** 14 tests; the BEO text goes through the shipped `classifyBeoLines` first, and the Pasta Bar spec
is the live one (15 lines; caesar dressing + croutons have no product). Also `matchedDishIds(items)` = the dish ids
Task 4 must fetch specs for. Mutation check: 6 rules broken one at a time, each fails 1-2 tests. Decided in code:
- A dish with a confirmed spec but NO ingredient lines goes to the AI too (a group with no rows would vanish).
- A dish on the BEO twice: one group, grey lines from both places, exact repeats dropped.
- **For Task 4:** two different dishes with the same name (Yogurt Parfait Bar ×2) in one BEO would get the same
  `source_dish`, and the page groups by `source_dish`, so they'd show as one group. Rare; check it there.

**Verification:** T (new `beoOrderList.test.js`) · B · **Dependencies:** Task 1
**Files:** `app/src/lib/beoOrderList.js`, `app/src/lib/beoOrderList.test.js` · **Scope:** S

### Checkpoint A
- [x] T and B green · Task 0 live and checked · live site unaffected

## Phase 2: The path end to end

## Task 4: Generate builds from confirmed specs; grey lines; "AI guess" label

**Description:** `generateOrderItems` reads the orderable dishes (count checked), the saved matches for this BEO's
lines, then classifies (T1). Unanswered lines are treated as "not on a menu" this time (spec rule 3, matcher comes
in T5). It fetches specs by `dish_id`, gets products through `productsForItemNames`, builds rows (T3), calls
`generate-order-items` only with the AI payload, and then replaces generated rows as today (manual rows untouched).
Order list: grey `beo_text` under each spec-built heading; an "AI guess" tag on non-manual `ai_guess` groups.
DB reads go in a small `lib/beoOrderData.js`.

**Acceptance criteria:**
- [x] Celebration of Life: exact-name dishes (Bacon-Wrapped Scallops, Caprese Skewer…) built from specs, with grey
      lines; the three near misses AI-labeled. *(BEO deleted 11-15: checked on American Outdoor Brands instead)*
- [x] Mid Mo Mahjong: Pasta Bar from its spec (Caesar Salad unanswered = part of it this time, as today).
      *(BEO deleted 11-15: covered by the Pasta Bar unit test only)*
- [x] Regenerate twice → identical spec rows (SQL); hand-added rows survive; ~~a fully-matched BEO makes no AI call
      (network tab)~~ → moved to Task 5 (no live BEO is fully matched until lines can be answered).

**Verification:** T · B · C (Celebration of Life, Mid Mo Mahjong, Walton Heath, 375px, 0 console errors)
**Dependencies:** T0–T3 · **Files:** `EventsBanquetsPage.jsx`, `app/src/lib/beoOrderData.js` · **Scope:** M

**Done (11-15):** Generate now: dishes (count-checked) + saved matches → classify → spec lines (count-checked) →
products → `buildOrderList` → AI only for `aiSections` → `generatedRows` (spec groups first, AI groups numbered after,
`ai_guess` true) → `replaceGeneratedRows` (delete + insert, both errors checked; today's code checked neither).
New pure helpers, test first: `beoLineKeys` (beoLines.js), `generatedRows` (beoOrderList.js); 288 tests. Mutation:
5 breaks, each caught. Browser (dev, live DB), Celebration of Life + Mid Mo Mahjong deleted by Ryan 11-15, so:
- **American Outdoor Brands:** Garden Salad, Prosciutto-Wrapped Chicken, Braised Short Ribs, Mousse Shooters from
  specs (30 lines, 28 with a product), grey lines incl. "with white wine truffle velouté"; 4 AI groups after, tagged.
- **Club Car Wash:** Garlic Mashed Potatoes from spec (6/6 products) mid-item; the other lines AI-tagged. Hand row
  added → Regenerate → spec rows md5 identical, rows re-created (17:36:57 > hand row 17:36:40), hand row kept, then
  removed (0 left). AI groups DID change between runs (Oreo Cheesecake 5 lines → 2): the reason for B.
- 375px (iframe; window resize had no effect): grey text and tag wrap, no sideways scroll; 0 console errors.
- Read-only preview of all 35 BEOs with the shipped modules: none fully matched without answers (all need Task 5).
- Yogurt Parfait same-name merge: only reachable if two DIFFERENT wordings in one BEO are each matched to one of
  the two same-name dishes (one wording = one answer). Left as is.
- Noticed, not touched: one long PFG word (`..._VACUUM_PACKED`) overflows into the note column at 375px (step A row).

### Checkpoint B (Ryan)
- [x] Ryan sees the spec-built groups and AI labels on real BEOs and OKs the layout before matching is added
      *(11-15: Ryan checked Club Car Wash on the dev server: "everything looks good")*

## Phase 3: Answering lines

## Task 5: The "lines to match" box

**Description:** `components/BeoLineMatcher.jsx`. On Generate, if any line is `to_match`, the box opens at the
top of that BEO's order list before building: each line with its BEO item for context, 3 suggestions (dish + menu +
section), Pick another dish (search), Not food, Not on a menu, Describes the line above. Each answer saves at once
(insert/upsert `beo_dish_matches`, error shown). **Build list** builds with what's answered.

**Acceptance criteria:**
- [x] Celebration of Life: answer the three near misses → Build list → all three from specs; Generate again asks
      nothing. *(11-16, on Club Car Wash New Managers Dinner instead — Celebration of Life deleted)*
- [x] Walton Heath: Not on a menu + Describes the line above → AI-labeled groups; the description line reaches the
      AI with its salad (request body). *(11-16, on Screaming Eagle Dinner Club instead — Walton Heath deleted)*
- [x] A failed save shows an error and leaves the line unanswered.
- [x] (from T4) A BEO whose lines are all answered and on a menu makes no AI call (network tab). *(11-16: no live
      BEO can — see below; Ryan counted Rusty Drewing as passing)*

**Ryan's real answers (11-16, dev server, live DB), checked by SQL + function logs + the shipped code read-only:**
- **Club Car Wash:** 15 answers saved. List = 7 groups from specs (Wings, Tenderloin, Garlic Mashed, Mac & Cheese,
  Roasted Vegetables, Caesar Salad ← near miss "Chopped Ceasar Salad", Cheesecake) + 1 AI group, Becca's rolls
  (answered Not on a menu; no rolls dish exists, so AI is correct). ONE `generate-order-items` POST (20:13 UTC).
  The shipped `classifyBeoLines` now finds 0 `to_match` lines on it, so Generate again opens no box.
- **Screaming Eagle Dinner Club** (a Street Dinner: Ryan writes a new menu every month, so it is ALWAYS AI-built):
  2 AI groups. Salad → radicchio, endive, bacon, pecans, pecorino; chicken → airline chicken, wild mushrooms, cream,
  wild rice, broccolini. Those ingredients exist only in the second lines, so each description reached the AI with
  its dish. Libby Reid + the allergy line answered Not food; no allergy row. One POST (00:17 UTC 11-17).
  Ryan answered the chicken's second line Not on a menu rather than Describes: same BEO item, so the same request.
- **Criterion 4:** Rusty Drewing (BQT Staff + timing line, both Not food) → no AI call in the logs, 0 rows, "No food
  items found" alert (true: nothing to order). But no live BEO is all-menu: a read-only run over all 34 BEOs found
  the 15 Thanksgiving take-outs have 0 menu dishes (that menu isn't loaded), and Club Car Wash is all-menu but for
  the rolls. The "no AI call" branch is unit-tested (T4) and shown live by Rusty Drewing.
- **Found, not fixed:** Screaming Eagle's dessert ("Pumpkin Pot de Creme Maple Chantilly, Candied Pecans") was
  parsed as a CATEGORY heading, so it never reaches the order list (`process-beo`); quantity lines ("Quart",
  "Dozen", "Serves 6-8 People") are asked, not taken as notes; two "Cheesecake" rows on From the Bakery (Plated
  Desserts), 9 and 7 lines.

**Built (11-16), waiting on Ryan's real answers for criteria 1, 2 and 4:** `BeoLineMatcher.jsx` (box + one line each),
`saveMatch` (upsert on `source_text,under_dish_id`; a rolled-back anon SQL test showed the null `under_dish_id` row is
UPDATED, not duplicated), Generate asks first (`askFirst`), Build list → `askFirst: false`. Pure, test first:
`linesToMatch` (one per wording, BEO item for context, "Describes the line above" only where a line sits above),
`matchRow`; plus a SEASON tie-break in dish order (the Seasonal menu repeats a name in all 4 seasons, so the order
came from the DB). 296 tests; 6 mutations, each caught. Dish labels show menu · section · season.
Browser (dev, live DB; every `beo_dish_matches` write blocked in the page): Walton Heath → box with 8 lines and NO AI
call; "Describes" missing on the first line only; the forced failed save showed "Not saved: …", line stayed
unanswered (0 answered), request body correct; search "caesar" lists Classic Caesar fall/spring/summer/winter; Cancel
closes; 375px no sideways scroll; 0 console errors; 0 rows in `beo_dish_matches` after. Celebration of Life is gone:
criterion 1 → any BEO with near misses. Criterion 4 candidates: Rusty Drewing Meeting (BQT Staff + its timing line)
or Edwards: Thanksgiving Take Out (one line, Pumpkin Cinnamon Cheesecake).
Seen, not changed: each line repeats its whole BEO item for context, long on an 8-line dinner club at phone width.

**Verification:** T (any new pure helper) · B · C (answers are Ryan's real answers) · **Dependencies:** T4
**Files:** `BeoLineMatcher.jsx` (new), `EventsBanquetsPage.jsx`, `beoOrderData.js` · **Scope:** M

## Task 6: Part of / Its own dish

**Description:** `ask_part_of` lines appear in the box as "<line> under <dish>: Part of / Its own dish", saved with
`under_dish_id`. Its own dish → built as its own group.

**Acceptance criteria:**
- [ ] Mid Mo Mahjong: Caesar Salad → Part of → asked never again for that pair; Caesar elsewhere unaffected.
- [ ] Its own dish (checked in a rolled-back SQL test or on a test pair with Ryan's OK) → a separate Caesar group.

**Verification:** T · B · C · **Dependencies:** T5 · **Files:** `BeoLineMatcher.jsx`, `beoOrderData.js` ·
**Scope:** S

## Task 7: Change match

**Description:** A "Change match" link on each spec-built group reopens the first line of its `beo_text` in the
box; the new answer replaces the saved one (same key). Regenerate applies it.

**Acceptance criteria:**
- [ ] Changing a match then Regenerate shows the new dish; the old answer is gone from `beo_dish_matches`.
- [ ] An exact-name match (no saved row) can be changed too: the new answer is saved and wins.

**Verification:** B · C · **Dependencies:** T5 · **Files:** `EventsBanquetsPage.jsx`, `BeoLineMatcher.jsx` ·
**Scope:** S

### Checkpoint C (Ryan)
- [ ] Spec Success Criteria 1–7 walked through on real BEOs

## Phase 4: Finish

## Task 8: Review and docs

**Description:** `/review-change` on the whole diff; fix what Ryan picks. Update the order-guide memory,
CLAUDE.md's Future Plans line, CHANGES.md. No push: B ships whenever main is pushed (Ryan, 11-12).

**Acceptance criteria:**
- [ ] Review findings resolved or accepted by Ryan; T · B green on main
- [ ] Docs say B is built on main, not live

**Verification:** T · B · **Dependencies:** Checkpoint C · **Scope:** S
