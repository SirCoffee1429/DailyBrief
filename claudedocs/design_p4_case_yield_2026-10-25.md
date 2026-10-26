# Design — P4 Slice 1: Per-Ingredient Case Yield

> `/sc:design --type database --format spec`, 2026-10-25. Design only — no code (next: `/sc:implement`).
> Requirements: `claudedocs/requirements_p4_unit_conversion_2026-10-19.md` (D1–D7, FR-1–FR-10, AC 1–8).
> Parent: `claudedocs/design_beo_order_guide_2026-09-15.md` §7.
> All counts measured on prod 2026-10-25 over `dish_ingredient_lines` (orderable dishes only).

---

## 0. Re-measured baseline (requirements §1 said "re-measure at design")

| Measure | 10-19 (requirements) | 10-25 (now) |
|---|---|---|
| Lines / names / dishes | 2,693 / 373 / 364 | **2,698 / 373 / 364** |
| Exact (same base unit, usable total) | 2,022 | **2,035** lines, 254 names |
| Cross-class gap | 446 | **438** lines, 66 names |
| Pack-count path (to be removed, D3) | 45 | **43** lines, **27** names, 34 dishes |
| No pack total (`#10` cans etc.) | 36 | **36** lines, 9 names |
| Not bought from this catalog | 143–145 | **145** lines, 49 names |
| Unpriced | 1 | **1** |
| **Need a yield** (cross + pack-count + no total) | 527 / 104 / 271 | **517 lines / 101 names / 270 dishes** |
| Mixed unit kinds on one name (D5) | 39 | **37** names |
| Dishes that cost fully today | 78 | **88** (the owner's 10-20/10-24 fixes) |
| …with the pack-count path removed and no yields yet | — | **76** |

The three hand-checked dishes (Bearnaise, House Cookies, Cubed Cheese & Crackers: 16 lines) are all on the exact
path, so AC 2 holds after the change.

**A conflict in the requirements, resolved by D3:** NFR-3 says lines that cost today keep their cost. The 43
pack-count lines cost today and **stop costing** when the path is removed, until each name gets a yield. Fully
costed dishes go 88 → 76 → back up as yields go in. D3 is the owner's explicit decision, so it wins; NFR-3 is
amended to cover only the exact path.

---

## 1. Q-1: draft the yields at all? — **ANSWERED 10-25: Option A, no drafts** (owner)

Wherever "Option B" appears below, it is dropped: no `draftYield()`, no pre-filled form, and AC 4 holds trivially.

FR-5 has three drafting rules. On today's data, by my reading of the pack sizes, they would draft **30 of the 101
names, and 9 of those 30 would be wrong.** The owner should check the sizes below; I have not confirmed them with PFG.

| Rule (FR-5) | Hits | Right | Wrong, and why |
|---|---|---|---|
| R1 — fl oz lines, `N/M OZ` pack → N × M fl oz | 12 | 7: heavy cream, lemon juice, buttermilk, truffle oil, white truffle oil, sherry wine, sherry wine vinegar | **5:** mustard `12/12 OZ`, ketchup `30/20 OZ`, demi glace `6/13.6 OZ`, pesto `2/32 OZ`, condensed milk `24/14 OZ` are net WEIGHT. These are exactly the "sauce weight-to-volume" FR-5 says never to draft, and the pack text can't tell them apart |
| R2 — `K/1` count per lb in the description, `N/M LB` pack | 2 | hot dog 40, bratwursts 40 | — |
| R3 — each lines, `N/M OZ` pack with N > 1 → N each | 16 | 12: buns, burger/hamburger/pretzel/slider buns, egg patty, pastries, angus burger, slider patty, focaccia, trail mix, biscuit | **4:** crostini `20/13 OZ` (20 baguettes, not 20 crostini), sourdough slices `8/35 OZ` (loaves), havarti slice `6/24 OZ` (twin packs), mozzarella `6/8 OZ` (cups of pearls) |

R3 is the removed pack-count path coming back as a suggestion, with the same failure (a pack is not a piece).

- **Option A (recommended): no drafts.** The yield form shows the pack text and product (already on the row), and
  the owner types each yield. That's 30 extra numbers out of 101, a few minutes. There's no draft code and no
  wrong number one `c` keystroke away from being confirmed. D7 changes from "drafted" to "typed".
- **Option B: draft as FR-5 says.** Add a pure `draftYield()` to `orderUnits.js`, pre-fill the form with its
  number and working, and accept that 9 known-wrong drafts need correcting, not confirming.

**The schema below is the same either way**: drafts are never stored (§2.4), so Q-1 only decides whether one
pure function and a pre-filled input exist.

---

## 2. Schema

### 2.1 Where the yield lives — four columns on `ingredient_products`

A yield is a fact about **this ingredient bought as this product**: "what one case of #970396 gives as hot dogs".
`ingredient_products` already holds exactly that pairing (PK = name, one product), so the yield goes on that row.

```sql
alter table public.ingredient_products
    -- What ONE CASE of product_id gives, in the unit the dishes use (D1), usable after trim (D2).
    add column if not exists yield_qty    numeric,
    add column if not exists yield_unit   text,
    -- Where the number came from, so it can be re-checked (FR-1, owner 10-20):
    -- "24 heads × 10 oz after trim", "6 × #10 at 6.6 lb net, PFG product page".
    add column if not exists yield_note   text,
    add column if not exists yield_set_at timestamptz,
    -- All four set or none, only on a confirmed match that HAS a product (FR-1),
    -- and a note is required (Q-c).
    add constraint ingredient_products_yield_whole check (
        (yield_qty is null and yield_unit is null and yield_note is null and yield_set_at is null)
        or (yield_qty > 0
            and yield_unit in ('oz', 'lb', 'floz', 'each')
            and btrim(yield_note) <> ''
            and yield_set_at is not null
            and status = 'confirmed'
            and product_id is not null)
    );
```

`yield_unit` uses the portion-unit list from `dish_ingredients.portion_unit`, so a yield is always in a unit a
dish line can be in.

### 2.2 Re-pick clears it — a trigger, not page code (D4, FR-6)

`product_id` is written by four paths (§3). A rule enforced in one page would miss the others, and the Supabase
MCP / hand SQL I use for fixes would miss it too. The database clears the yield whenever the product changes:

```sql
-- A yield was stated for ONE product's pack. Changing the product (or "not bought from this
-- catalog", product_id -> null) makes it a statement about a case nobody buys any more.
create or replace function public.ingredient_products_clear_yield()
returns trigger
language plpgsql
as $$
begin
    if new.product_id is distinct from old.product_id then
        new.yield_qty    := null;
        new.yield_unit   := null;
        new.yield_note   := null;
        new.yield_set_at := null;
    end if;
    return new;
end;
$$;

create trigger ingredient_products_clear_yield
    before update on public.ingredient_products
    for each row execute function public.ingredient_products_clear_yield();
```

BEFORE triggers run before CHECK constraints, so a re-pick never trips `_yield_whole`. An `INSERT … ON CONFLICT DO
UPDATE` (the page's `upsert`) fires the BEFORE UPDATE trigger on its update branch, so Change is covered.

### 2.3 Views — append three columns, repeat `security_invoker`

Both review pages read `select('*')`, so new columns reach them with no query change. `CREATE OR REPLACE VIEW`
can only **append** columns, and it **resets `security_invoker`** unless the WITH clause repeats it (CLAUDE.md).
Both definitions are copied from **prod** (`pg_get_viewdef`, 10-25), not from `schema_baseline.sql`, which is
older than `ingredient_usage.dishes` and `last_purchased_on`.

- `dish_ingredient_lines` — after `sp.price_as_of`, append `ip.yield_qty, ip.yield_unit, ip.yield_note`.
- `ingredient_usage` — after `u.dishes`, append `ip.yield_qty, ip.yield_unit, ip.yield_note, ip.yield_set_at`.

No new view: the work queue (FR-7) and mixed-unit list (FR-8) both come from `ingredient_usage.dishes`, which
already has one entry per line with `qty` and `unit` (§5).

### 2.4 What is deliberately NOT stored

- **No `yield_status` / drafts.** Under Option B a draft is computed on screen from the pack text and stored only
  when the owner saves it, at which point it is the owner's number. Every stored yield is confirmed, so NFR-1
  ("drafts never count") is true by construction.
- **No yields table.** A table keyed `(ingredient_name, product_id)` would make re-pick "clear" by orphaning
  rows, and an orphan revives if the old product is picked again. CLAUDE.md's rule "no match may outlive its
  last dish" argues against rows nobody can see.
- **No waste factor, no density, no servings per case** (D2, design §7, Q-a).

### 2.5 Migration

`supabase/migrations/20261025000000_ingredient_case_yield.sql`: §2.1 + §2.2 + §2.3, applied with
`apply_migration` (never `db push`). RLS needs no change: the existing `allow_all_ingredient_products` policy
covers the new columns.

---

## 3. Every write to `ingredient_products`, and what happens to the yield

| Writer | What it does | Yield |
|---|---|---|
| `saveMapping` (Ingredient Products: Confirm `c`, Change/Pick, Not from catalog `n`) | `upsert` of name, product, note, status | Same product: **kept** (yield columns aren't in the payload). Different product or null: **cleared** by the trigger |
| `upsert_ingredient_product_drafts` (matcher) | updates **draft** rows only | A draft row can't hold a yield (CHECK), so nothing to clear |
| Split, every dish moved to a brand-new name | `update ingredient_name` | **Carried**: same product, same dishes, same units, so still true |
| Split onto an existing name, or the last dish leaves | `delete` | **Gone** with the row |
| Split, some dishes moved | dish lines change names | Moved lines take the target's yield. A unit-kind clash shows as `yield_mismatch` (§4) |
| **New: `saveYield`** (§5) | `update … set yield_* where ingredient_name = $1 and product_id = $2 and status = 'confirmed'` | Sets it, or clears all four. The `product_id` filter refuses a yield typed against a product another tab has just changed; the page checks that exactly 1 row was written, the way Split checks its moved count |

`draft-dish-specs` reads mappings through the upsert RPC only. Adding columns doesn't touch it.

---

## 4. `app/src/lib/orderUnits.js` — the one shared calculation (FR-10)

Contract changes. The functions stay pure, and every caller still passes a `dish_ingredient_lines` /
`ingredient_usage` row as the product.

**`unitFit(portionUnit, product)`**, in order:
1. unknown portion unit → `no_conversion`; no product → `unmapped` (unchanged).
2. **The product row has `yield_qty`** (FR-2):
   - same unit kind as `yield_unit` → `{ ok, perCase: portionInBase(yield_qty, yield_unit), baseUnit, source: 'yield', yieldQty, yieldUnit }`.
     `oz`↔`lb` convert exactly, through the existing factors.
   - different kind → `{ ok: false, reason: 'yield_mismatch' }` (FR-4), **even if the pack would fit**. That's
     the point: heavy cream yielded in fl oz must not let an `oz` line cost against the `12/32 OZ` weight read.
3. No yield: today's native path (same base unit, usable total) → `source: 'pack'`.
4. **The pack-count branch is deleted** (D3). A count line against a weight pack falls through to `no_conversion`.
5. `no_pack_total` / `no_conversion` (unchanged).

`viaPackCount` is removed. Its only readers are `fitLabel` and this file (grep, 10-25).

**`GAP_REASONS`** gains:
`yield_mismatch: 'Line is in a different kind of unit from the stated case yield — respec this line'`.

**`fitLabel(fit)`** (FR-9): a yield shows as stated, not in base units. `384 fl oz per case (stated yield)`,
`40 each per case (stated yield)`. A pack reads as today: `24 lb per case`.

**`specCost` / `lineGap`**: no change in shape. They call `unitFit(line.portion_unit, line)`, and the line now
carries the yield columns from the view.

**Option B only:** `draftYield(row) → { qty, unit, working } | null`, implementing R1–R3 exactly as FR-5 words them.

---

## 5. Ingredient Products page (FR-7, FR-8, NFR-2)

Everything below is computed in the page from `ingredient_usage` with the shipped `unitFit`. No new queries.

- **Two new filters** beside To review / Not matched / Confirmed / All:
  - **Needs yield (N)**: a confirmed match with a product, where at least one line's fit is `no_conversion`
    or `no_pack_total`. Sorted by how many lines that is, most first (FR-7). Today that's 101 names, the top
    being heavy cream 96, chicken stock 31, cherry tomatoes 17, sour cream 17.
  - **Mixed units (N)**: names whose lines span two or more unit kinds (37 today), with the **minority-kind
    lines** marked in the dish list (dish, portion, unit), so the respec is done on Dish Ingredients (FR-8).
    A `yield_mismatch` line also lands here.
- **On the row**: under the product, `Case yield: 40 each — <note> · set <date>`, or nothing. The per-unit fit
  line already shows (`each: 40 each per case (stated yield)`, `oz: Line is in a different kind…`).
- **Key `y` / a "Case yield" button** opens a third edit mode beside `product` and `split`:
  - inputs: quantity, unit (`oz` `lb` `fl oz` `each`, defaulting to the unit most of the name's lines use),
    note (required);
  - context shown beside them: the pack text, the product description and its dishes' units;
  - Enter saves, Escape cancels, **Clear yield** removes it. `useKeyboardReview` already pauses while
    `editingId` is set.
- A `y` on a row with no confirmed product does nothing. The DB would refuse it anyway (CHECK).

**Dish Ingredients** gets no code change. The gap text and cost come from the shared functions, and the new
reason shows on its own.

---

## 6. Verification plan (maps to AC 1–8)

| AC | How |
|---|---|
| 1 No pack-count path | SQL mirroring `unitFit` counts 0 lines costed by inner-pack count. The 27 names show under **Needs yield** on the page, a count the shipped code computes |
| 2 No regression | Before any yield is entered: Bearnaise $0.9559/guest, House Cookies $4.1133/dozen, Cubed Cheese $17.6807/tray, read off Dish Ingredients |
| 3 Hand-checked conversions | A scratch `node` script that **imports the shipped `orderUnits.js`** (no retyped copy) runs hot dog `1/10 LB` + yield 40 each; heavy cream + 384 fl oz; coconut shrimp + the owner's count; lettuce + a usable-oz yield. Hand math beside each, numbers shown to the owner |
| 4 Drafts don't count | Option A: there are no drafts. Option B: a pre-filled, unsaved form leaves the line a gap (browser) |
| 5 Re-pick clears | In a rolled-back transaction on a real row: set a yield, change `product_id`, select → all four null. Same for `product_id → null` |
| 6 Mismatch is named | Heavy cream with a fl oz yield: its `oz` lines read the `yield_mismatch` text on both pages |
| 7 Coverage reported | Fully costed dishes: 88 today → 76 after the change → N after the owner's entry pass, by SQL, cross-checked against the page |
| 8 | `npm run build` + the owner's browser review |

Also verified once after the migration: `security_invoker` is still `on` for both views (`pg_class.reloptions`),
and the trigger refuses nothing on today's 373 rows (it's an UPDATE-only trigger, and no row has a yield yet).

---

## 7. Build order

1. Migration (§2) → verify: AC 5, `security_invoker`, columns visible through both views.
2. `orderUnits.js` (§4) → verify: AC 2, AC 3 (the node script against the shipped module), `npm run build`.
3. Ingredient Products UI (§5) → verify: AC 1, 6 in the browser; phone width checked too, since Split's never was.
4. Owner's entry pass (about 101 yields + 37 mixed-name respecs) → AC 7.

Nothing in 1–3 changes data. Step 2 alone moves 43 lines from costed to gap, the D3 consequence in §0.

---

## 8. Not in this slice

As in requirements §6, plus: `schema_baseline.sql` isn't regenerated for one migration (its header says how,
when wanted). No change to `draft-dish-specs`, the matcher, or `save_dish_spec`.
