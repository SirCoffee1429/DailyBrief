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
- [ ] SQL reviewed with Ryan, then **applied to prod only with his OK**.
- [ ] Checked by `SELECT`: table, constraints and policies exist; `event_order_items` rows all read `ai_guess = true`.
- [ ] As anon, inside a rolled-back transaction: insert one row per kind, and the two checks and the unique key
      refuse bad rows. 0 rows kept.

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
- [ ] Top suggestion is right for: Tiny Tinga Taco → Tiny Tinga Tacos; Raspberry Baked Brie Bites → Raspberry &
      Baked Brie Bites; Watermelon, Feta & Grape Tomato Skewer → Watermelon, Feta, & Tomato; Seasonal Chopped
      Fruit Platter → Seasonal Chopped Fruit (Platters) in the top 3.
- [ ] A line sharing no word gets no suggestions; "&", "with", "and" don't count as shared words.

**Verification:** T · B · **Dependencies:** Task 1 (same file) · **Files:** `beoLines.js` + test · **Scope:** S

## Task 3: `lib/beoOrderList.js`: decided lines → rows (test first)

**Description:** Pure. Input: classified lines (Task 1), the confirmed specs for the matched dishes, the
product map. Output: (a) spec rows `{ item_name, source_dish, product_id, beo_text, ai_guess: false, sort_order }`,
one group per dish (a dish twice in a BEO → once), dishes whose spec isn't confirmed moved to (b); (b) the AI
payload: synthetic `sections` holding only not-on-a-menu / unanswered lines, each with its describes-above lines
and category name, or `null` when there are none.

**Acceptance criteria:**
- [ ] Pasta Bar fixture → its 15 ingredients in spec order, `beo_text` = the item's lines, products from the map.
- [ ] Same input twice → deep-equal output (determinism; calls the shipped module).
- [ ] Walton Heath fixture → AI payload holds the salad with its description line, nothing spec-built; a BEO
      fully on menus → payload `null`.

**Verification:** T (new `beoOrderList.test.js`) · B · **Dependencies:** Task 1
**Files:** `app/src/lib/beoOrderList.js`, `app/src/lib/beoOrderList.test.js` · **Scope:** S

### Checkpoint A
- [ ] T and B green · Task 0 live and checked · live site unaffected

## Phase 2: The path end to end

## Task 4: Generate builds from confirmed specs; grey lines; "AI guess" label

**Description:** `generateOrderItems` reads the orderable dishes (count checked), the saved matches for this BEO's
lines, then classifies (T1). Unanswered lines are treated as "not on a menu" this time (spec rule 3, matcher comes
in T5). It fetches specs by `dish_id`, gets products through `productsForItemNames`, builds rows (T3), calls
`generate-order-items` only with the AI payload, and then replaces generated rows as today (manual rows untouched).
Order list: grey `beo_text` under each spec-built heading; an "AI guess" tag on non-manual `ai_guess` groups.
DB reads go in a small `lib/beoOrderData.js`.

**Acceptance criteria:**
- [ ] Celebration of Life: exact-name dishes (Bacon-Wrapped Scallops, Caprese Skewer…) built from specs, with grey
      lines; the three near misses AI-labeled.
- [ ] Mid Mo Mahjong: Pasta Bar from its spec (Caesar Salad unanswered = part of it this time, as today).
- [ ] Regenerate twice → identical spec rows (SQL); hand-added rows survive; a fully-matched BEO makes no AI call
      (network tab).

**Verification:** T · B · C (Celebration of Life, Mid Mo Mahjong, Walton Heath, 375px, 0 console errors)
**Dependencies:** T0–T3 · **Files:** `EventsBanquetsPage.jsx`, `app/src/lib/beoOrderData.js` · **Scope:** M

### Checkpoint B (Ryan)
- [ ] Ryan sees the spec-built groups and AI labels on real BEOs and OKs the layout before matching is added

## Phase 3: Answering lines

## Task 5: The "lines to match" box

**Description:** `components/BeoLineMatcher.jsx`. On Generate, if any line is `to_match`, the box opens at the
top of that BEO's order list before building: each line with its BEO item for context, 3 suggestions (dish + menu +
section), Pick another dish (search), Not food, Not on a menu, Describes the line above. Each answer saves at once
(insert/upsert `beo_dish_matches`, error shown). **Build list** builds with what's answered.

**Acceptance criteria:**
- [ ] Celebration of Life: answer the three near misses → Build list → all three from specs; Generate again asks
      nothing.
- [ ] Walton Heath: Not on a menu + Describes the line above → AI-labeled groups; the description line reaches the
      AI with its salad (request body).
- [ ] A failed save shows an error and leaves the line unanswered.

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
