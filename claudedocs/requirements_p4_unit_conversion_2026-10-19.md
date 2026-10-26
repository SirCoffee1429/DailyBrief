# Requirements — P4 Slice 1: Per-Ingredient Case Yield

> `/sc:brainstorm` output, 2026-10-19. Requirements only — no schema, no UI layout (next: `/sc:design`).
> Parent: `claudedocs/design_beo_order_guide_2026-09-15.md` §7 ("Carried into P4") and §9 (P4 row).
> All counts measured on prod 2026-10-19 over `orderable_menu_dishes` (364 dishes, 2,693 lines).

---

## 1. Goal

Every ingredient line that has a confirmed product can be turned into "how much of a case", with no
guess anywhere in the chain. Today only **78 of 364 dishes** cost fully. 527 lines (104 ingredient names,
271 dishes) cannot, because their portion unit and the product's pack do not meet (10-20: the cayenne
re-pick takes 6 lines / 1 name out of that count; the rest is unchanged by the 10-20 fixes — re-measure at
design):

| Pattern | Examples | What is missing |
|---|---|---|
| Liquid by fl oz, PFG pack in "OZ" | heavy cream `12/32 OZ` (96 lines), lemon juice, buttermilk, sherry vinegar, truffle oil | PFG's OZ here is FLUID oz (12 quarts); the catalog reads it as weight |
| Sauce by fl oz, sold by weight | sour cream, ranch `1/20 LB`, ketchup, mustard, honey | volume in a case |
| Stock by fl oz, bought as paste base | chicken (31), beef (10), vegetable (6) stock | stock one case makes |
| Produce by weight, sold by count | lettuce `24/1 CT`, cucumber, leeks, melons, berries `1/12 CT` (pints) | usable oz in a case |
| Used by the piece, sold by weight | hot dog `1/10 LB` (4/1 → 40), brats, oranges, chicken legs; the 27 pack-count names | pieces in a case |
| No usable pack total | `6/#10 CN` — canned tomatoes (19), paste, pumpkin, beans, olives, salsa | net contents of a case |

This slice is useful before any BEO work: it fixes costing on Dish Ingredients directly, and the P4
order list (slice 3) reuses the same arithmetic.

---

## 2. Owner decisions (2026-10-19)

| # | Question | Decision |
|---|---|---|
| D1 | Shape of the fact | **Case yield**: one number per ingredient — what ONE CASE gives, in the unit the dishes use (`heavy cream: 1 case = 384 floz`, `hot dog: 1 case = 40 each`) |
| D2 | Trim and loss | **Usable yield** — trim is baked into the number (`lettuce: 1 case = 240 oz usable`). No separate waste factor |
| D3 | Pack-count guess | **Removed.** All 27 names that use it need a stated yield, including the ones it gets right (buns 72) |
| D4 | Re-picking the product | **Clears the yield** — it was stated for that product's pack; the ingredient is a gap until restated |
| D5 | Ingredients used in two unit kinds | **Respec the minority lines** so each ingredient uses one unit kind. 39 names, 78 lines |
| D6 | Yield on ingredients that already convert | **Allowed anywhere** — required for the gaps, optional override on any other (onions 50 lb → 42 lb usable) |
| D7 | Blank or drafted | ~~Drafted from the pack text~~ **Revised 10-25: no drafts — the owner types every yield** (design §1: the FR-5 rules would draft 30, 9 of them wrong). FR-5's drafting rules are dropped; unconfirmed = gap still holds |

---

## 3. Functional requirements

**FR-1 — State a yield.** For any confirmed ingredient → product match, the owner can record one case
yield: a positive number, one portion unit (`oz`, `lb`, `floz`, `each`), and a short note saying where the
number came from (`24 heads × 10 oz after trim`, `6 × #10 at 6.6 lb net, PFG product page`) so it can be
re-checked later (owner, 10-20). A drafted yield's note is its working (FR-5).

**FR-2 — Yield wins.** When an ingredient has a confirmed yield, a line in the same unit KIND (weight /
volume / count) is measured against it — never against the pack text, even where the pack text would also
work (D6). `oz` and `lb` are the same kind; `lb` converts exactly.

**FR-3 — No yield, native only.** Without a confirmed yield, a line costs only when its unit kind matches
the product's own pack kind with a usable total (today's exact path). The pack-count allowance is deleted
(D3) — a count line against a weight-sold pack is a gap.

**FR-4 — Unit-kind mismatch is a gap with its own reason.** A line whose unit kind differs from the
yield's (e.g. heavy cream yield in floz, one dish in oz) is a gap, named so the owner knows to respec that
line rather than to state another number (D5). Gap reasons stay words a reviewer can act on.

**FR-5 — Drafts never count.** A drafted yield shows its number AND its working
(`12 × 32 OZ = 384 floz — PFG OZ on a liquid read as fluid oz`) and costs nothing until the owner confirms
it. Unconfirmed = gap. Drafting is deterministic from the pack text (no model call), offered only when the
text alone settles it:
- `N/M OZ` liquid → N × M floz; `N/M LB` with a stated count per lb (`4/1` franks) → pieces;
  `N/M OZ` piece items (`72/3.17 OZ` buns) → N each.
- Never drafted: produce trim, sauce weight-to-volume, stock-base dilution, `#10` cans, anything the text
  doesn't state. (`#10` net weight is on PFG's product page, per case in lb, but NOT in the catalog — no
  export column carries it and none of the 9 `6/#10 CN` descriptions state it. The owner enters it.)

**FR-6 — Re-pick clears.** Changing an ingredient's product removes its yield (confirmed or drafted) in the
same write. "Not bought from this catalog" removes it too.

**FR-7 — Work queue.** The owner can see the ingredients needing a yield, most lines affected first (the
top 30 names cover 396 of 527 lines), with each one's pack text, product, dishes, and the units those
dishes use.

**FR-8 — Mixed-unit list.** The owner can see the 39 mixed ingredients with the minority lines named (dish,
portion, unit), so the 78 respecs can be done on Dish Ingredients. A respec is an ordinary line edit.

**FR-9 — Costing shows its basis.** Wherever a line is costed, the reviewer can see whether it used the
stated yield or the pack, as `fitLabel` does today ("40 each per case (stated yield)").

**FR-10 — One shared calculation.** The yield logic lives in `app/src/lib/orderUnits.js` (pure functions),
so Dish Ingredients, Ingredient Products and the P4 order list run the same code — never a retyped copy
(`feedback-verification-must-share-the-shipped-code`).

---

## 4. Non-functional requirements

- **NFR-1 No guess costs.** No line is costed from a number a human has not confirmed. Drafts, the old
  pack-count path and any density are all excluded.
- **NFR-2 Keyboard review.** Stating or confirming a yield is fast enough for ~104 entries in one sitting —
  the same keyboard-first review as `c` / `e` / `n` / `s` on Ingredient Products (design §10 Risk 1).
- **NFR-3 Additive.** Existing confirmed matches, dish lines and statuses are untouched; lines that cost
  today keep the same cost unless the owner states a yield for them — except the 43 pack-count lines, which D3
  turns into gaps until their yields are stated (design 10-25 §0).
- **NFR-4 Same access as the rest of the office.** No new auth (design NFR-5).

---

## 5. Acceptance criteria

1. **No pack-count path:** after the change, 0 lines are costed by inner-pack count; the 27 affected names
   each show a gap until a yield is confirmed (measured by SQL + the shared function).
2. **No regression:** with NO yields stated, every line that costs today costs the same — the three
   hand-checked dishes still give Bearnaise $0.9559/guest, House Cookies $4.1133/dozen, Cubed Cheese
   tray $17.6807 at today's prices.
3. **Hand-checked conversions** (shipped function vs hand math): hot dog 40 each/case on a 4/1 10 lb case;
   heavy cream 384 floz on `12/32 OZ`; coconut shrimp on its owner-stated count; lettuce on a usable-oz
   yield. Each checked against the arithmetic, with the numbers shown to the owner (fidelity ≠ correctness).
4. **Drafts don't count:** a drafted, unconfirmed yield leaves its lines as gaps.
5. **Re-pick clears:** changing the product on a yielded ingredient leaves no yield on it (SQL).
6. **Mixed-unit lines are named:** a line in the other unit kind shows the mismatch reason, not "different
   kinds of unit".
7. **Coverage reported:** fully-costable dishes before (78) and after the owner's entry pass.
8. `npm run build` passes; owner checks the review in the browser.

---

## 6. Out of scope (this slice)

- BEO line → dish matching (`beo_dish_matches`) — slice 2.
- Order quantities, rounding to cases, the order-list page, and whether it replaces the existing AI order
  list (`generate-order-items`, 61 rows in `event_order_items` today) — slice 3.
- Overage buffer (design Q5) — still off.
- The 145 lines on ingredients "not bought from this catalog" (49 names) — they stay gaps by design.
- Redrafting spring–winter from their books — happens when each book arrives.

---

## 7. Found along the way (owner to look at — not part of this slice)

These surfaced in the gap list and looked like **wrong matches**, not missing conversions. Resolved 10-20:
- `celery` (15 lines, by oz) was on CELERY ROOT → owner re-picked **CELERY SIZE 30** #865031 `1/24 CT`.
  Still needs a yield (usable oz per 24 heads) — counted in the queue.
- `cayenne pepper` (6 lines, by oz) was on a hot sauce → owner re-picked **PEPPER CAYENNE GROUND** #877906
  `1/5 LB`. Now costs exactly; no yield needed.
- `pickles` (12 lines, by oz) → `1/5 GA` pail — **correct** (owner). Needs a yield (usable oz per pail).

Found 10-20, fixed 10-24 (see Q-b): the **whole** Bourbon Pecan Pie (From the Bakery → Whole Desserts, $50 each) is
specced SMALLER than one slice (Plated Desserts, $11 a piece) — flour 0.5 oz vs 1 oz, eggs 0.5 vs 1, butter
0.5 oz vs 1 oz. Looks like a slice spec halved, not a pie. Owner to respec on Dish Ingredients.

---

## 8. Open questions

- **Q-a — answered 10-20:** PFG states a net weight in lb per `#10` case (and servings per case) on its
  product page, per product. The catalog doesn't carry it, so the owner reads it from PFG and enters it as
  the yield, the source in the note. Servings per case aren't used — the dishes measure in oz.
- **Q-b — answered 10-24:** owner respecced `breadsticks` to **each** (winter Caesar 0.5 each) and
  `corn syrup` to **floz** on every line. All three Bourbon Pecan Pie specs were rewritten from a standard
  9-inch pie (whole = per each, slice and Plated Dinners = one-eighth; vanilla in floz). The split was:
  - `breadsticks`: Build Your Pasta Bar **1.5 each** / Classic Caesar (winter) **0.75 oz**. Sold `1/126 CT`,
    so `each` costs with no yield.
  - `corn syrup`: Bourbon Pecan Pie (Plated Dinners) **1.5 floz**, whole pie **1.5 floz** / slice **1.5 oz**,
    Mini Bourbon Pecan Tarts **0.3 oz**. Sold `4/1 GA`, so `floz` costs with no yield.
- **Q-c — answered 10-20:** yes, every stated yield carries a short note (FR-1).
