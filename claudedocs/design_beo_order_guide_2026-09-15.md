# Design — Supplier Order Guide in BEO Order Lists

**Date:** 2026-09-15
**Requirements:** `claudedocs/requirements_beo_order_guide_2026-09-07.md`
**Status:** Design. No code written, no migration applied.

---

## 1. What changed since the requirements doc

All three blocking questions (Q1–Q3) are answered. Two answers came from files
delivered 09-08 and 09-14; the third came from profiling them.

| Q | Was | Now |
|---|---|---|
| Q1 unit conversion | "top unresolved risk", density needed | **Mostly dissolved.** 92.6% of the food catalog is weight or count. Design forbids cross-class conversion outright. §7 |
| Q2 catalog export | not available | **13 raw exports in `Vendor Data/Order Guides/`.** One identical schema across all 13. §4 |
| Q3 catering menu | not available | **8 PDFs, 18 pages, in `New Catering and Event Menus 2026/`.** ~250–300 dishes. §5 |

### A correction to carry forward

On 2026-09-14 I claimed the menu file names map onto BEO left-column labels, so a
BEO line could be matched to a menu section. **That is wrong.** It was inferred
from parser labels recorded in `CHANGES.md`, not from live data. The 23 BEOs in
production carry labels like `Buffet`, `A La Carte Ordering`, `Appetizer(s)`,
`BAGGED Lunch`, `Rentals`, `Services` — BEO *line types*, not menu sections. Dish
names live inside the description string. §6 designs against the real shape.

---

## 2. Validated facts

Everything below was measured this session, not assumed.

### Catalog (13 raw exports)

- **One header signature across all 13 files**, header on row 7, six preamble rows
  carrying the list name (row 2) and account (row 3).
  Columns: `Custom Product Description | Product Description | Brand | StateOfOrigin
  | Domestic | Custom Product Number | Product Number | Pack Size | UOM | Price`.
- **`Price` encodes its own basis**: `"$54.46"` = per case, `"$6.1199/lb"` = catch
  weight. The master list's `Price Basis` column was derived from this suffix — it
  is **parsed, never inferred**. 2,630 per-case / 370 per-lb / 8 empty.
- **The merge rules reproduce the AI-built master exactly.** Dedupe by
  `Product Number`, highest price wins within the batch:

  | | computed | master says |
  |---|---|---|
  | unique products | **1,381** | 1,381 |
  | price-varies flagged | **394** | 394 |
  | no price | **6** | 6 |

  3,008 raw rows → 1,381 products. This makes the master file **disposable**: the
  app can rebuild it from source, deterministically, with no AI.
- `StateOfOrigin` is empty on all 3,008 rows — drop it. `Custom Product Description`
  is populated on 5 — keep it, it is the club's own name for an item.
- Two PFG account numbers appear (`56859020`, `108513`). Both are the same club.

### Catalog composition (1,141 food products)

| Class | Units | Share |
|---|---|---|
| Weight | LB, OZ, KG, GM | **84.9%** |
| Count | CT, DZ, SL, BX | 7.7% |
| Volume | GA, LT, PT | 5.2% |
| Can | CN (all `6/#10 CN`, 25 items) | 2.2% |

### Menus (8 PDFs)

- Hand-designed marketing layouts. Multi-column pages, font roles inconsistent
  between documents, one font class mixing section headers with dish names.
  **No deterministic parser is possible — and none is needed** (§5).
- Prices are embedded in dish names (`+$8`, `$7`, `$30/doz`).
- **Some dishes carry their own yield**: "Serves 20", "Minimum 20 pieces/type",
  "Minimum order of 10 per sandwich type". This partially answers F1 — the menus
  supply a denominator the recipe library lacks.
- **Seasonal menus are date-scoped**: Fall = Sept–Nov, Winter = Dec–Feb. Dish specs
  need a season dimension. *New requirement, not in the requirements doc.*

### Live BEOs (23 events, 42 item lines)

- A composed buffet is **one item line whose description is a newline-joined list of
  component dishes**:
  `Denver Steak / Baked Potato Bar / Country Style Green Beans / Cobb Salad /
  Chocolate Mousse Cake / $38/Person`
- Those component names **do** match the menus verbatim (Cobb Salad, Country Style
  Green Beans, Garlic Mashed Potatoes, Caesar Salad are all on Plated Dinners or
  Custom Buffets). The join is per description *line*, not per section.
- `qty` is the real multiplier and is **not** always `guest_count`: one 90-guest
  event carries 82 turkey / 8 gluten-free / 37 ham bagged lunches.
- Several line types are permanently unorderable: `Rentals`, `Services`,
  `Cart Rentals`, and budget-only lines (`Chef's Choice Small Bites — Budget $16 per
  person AT COST`) that name no dish at all.
- Menu price rides along in the text (`$38/Person`), so food cost vs. menu price is
  available later. Out of scope for v1.

---

## 3. Architecture

Unchanged core decision: **inference happens once per thing, never per BEO.**

```
ONE-TIME (AI drafts -> human confirms -> stored)
  13 PFG exports ---> supplier_products          (no AI, deterministic)
  8 menu PDFs ------> menu_dishes                (AI draft, confirm)
                 |--> dish_ingredients           (AI draft, confirm)
  ingredient names -> ingredient_products        (vector shortlist, AI picks, confirm)
  BEO text lines ---> beo_dish_matches           (AI proposes, confirm, cached forever)

PER BEO (pure arithmetic, no model call)
  sections -> split description lines
           -> beo_dish_matches      -> miss = GAP
           -> dish_ingredients      x qty (x waste factor)
           -> ingredient_products   -> miss = GAP
           -> unit conversion       -> class mismatch = GAP
           -> ceil(need / pack_total) = order qty
           -> x case_price = line cost
           -> aggregate same product across dishes -> event total
```

`beo_dish_matches` is new — the requirements doc assumed BEO lines would name dishes
directly. They don't, so the free-text-to-dish join needs its own confirm-once cache.

---

## 4. Catalog ingestion

**Input:** N raw `.xlsx` exports, uploaded together as one batch. Not the master.

Per file: read sheet `Product List Report`, take the list name from row 2 and the
header from row 7, skip rows with no `Product Number`.

**Merge rules (the entire algorithm — deterministic, no AI):**
1. Identity is `Product Number`.
2. Highest price wins **within the batch**.
3. `price_varies` = true when two rows in the batch disagree on price.
4. `source_lists` accumulates every list name the product appeared on.

> **Rule 2 is scoped to one batch on purpose.** Applied across uploads it becomes a
> ratchet: an item that was $80 on one list and $101 on another stays at $101 forever,
> even after both drop to $70. Within a day's batch it is a sensible never-under-cost
> guard; across time it is a silently wrong number.

**Refresh semantics**
- Upsert on `product_number`. Price, pack, basis, `price_as_of`, `source_lists`,
  `last_seen_at` are replaced from the new batch.
- `category` and `item_group` are **sticky** — set once, never recomputed, so a
  refresh cannot churn them.
- **Never delete.** A product missing from a batch means it wasn't on that export,
  not that it's discontinued. `last_seen_at` carries the truth.
- Confirmed `ingredient_products` rows are untouched by any refresh. (FR-3)

**Derived at ingest, once**
- `pack_size` "14/4 LB" → `pack_count` 14, `pack_unit_size` 4, `pack_unit` LB,
  `pack_total_base` 56, `base_unit` 'lb'.
  Ranges ("8/6-7 LB") store `pack_unit_size` 6 and `pack_unit_size_max` 7; the **low
  end** is used for ordering so we never under-buy.
- `case_price` = `price` when basis is per-case, else `price × pack_total_base`.

> Computing `case_price` at ingest rather than at read is the single defence against
> the 219 catch-weight items. Read-time branching means every future call site must
> remember the rule; one of them eventually won't, and the line comes out ~50× low.

**Manual one-time fill:** the 25 `6/#10 CN` products need a `pack_total_base` each
(a #10 can is nominal, not fixed). Everything else parses.

---

## 5. Menu ingestion and dish specs

The menus cannot be parsed deterministically, and that is acceptable **because this
runs once behind a human gate and never again**. Non-determinism is only dangerous in
the per-BEO path, which stays arithmetic.

**Flow:** upload the 8 PDFs → Gemini (multimodal, on the upgraded model) drafts
`menu_dishes` + `dish_ingredients` → Ryan confirms in a review UI → stored.

**Portion units are constrained at the point of entry** to `oz | lb | ct | each |
floz`. This is what keeps density out of the system (§7). The UI offers no other
unit, so an unconvertible spec cannot be created.

**Seasonal handling:** a dish carries `season` (null / fall / winter) plus
`effective_start`/`effective_end`. A BEO dated in November resolves to the Fall
variant when one exists.

**Scale is the main risk.** ~250–300 distinct items across 18 pages. NFR-4 said the
setup should take one or two sittings; at this size that is not true, and the honest
plan is to sequence it rather than pretend otherwise:

1. **Custom Buffets + Plated Dinners first** — live BEOs draw almost entirely from these.
2. Hors d'Oeuvres, Breakfast, Quick Lunch Bites, Platters.
3. Seasonal Fall / Winter.

Everything unconfirmed simply surfaces as a gap (FR-20), so the feature is useful
after step 1 rather than only after step 3.

> Prioritising by observed BEO frequency was considered and rejected: 23 BEOs / 42
> item lines is too small a sample, and many lines are rentals and services.

---

## 6. BEO line matching

For each item in `sections[].categories[].items[]`, split `description` on newlines
into candidate lines, then per line:

- Drop lines that are prices (`$38/Person`), service notes (`Orders taken by server`,
  `Member charge`), or bare quantities.
- Normalise (lowercase, collapse whitespace, strip punctuation) and look up
  `beo_dish_matches.source_text`.
- **Hit** → the mapped dish, or `is_ignored` for a line deliberately marked
  non-food (`Cart Rentals`, `Beverage Cart`, `Tack Room`).
- **Miss** → AI proposes a dish from `menu_dishes`, Ryan confirms or marks ignored,
  and the answer is cached forever. Until confirmed it is a **gap row**, never a guess.

**Multiplier** is the item's own `qty`, falling back to `guest_count` when qty is
blank — which the geometric parser legitimately produces at headcount 0. Using
`guest_count` for the bagged-lunch example would order 90 of each of three variants
instead of 82 / 8 / 37.

**Permanent gap class:** budget-only lines ("Chef's Choice Small Bites — Budget $600
AT COST") name no dish and never can be costed by arithmetic. They surface as gaps
with a reason, which is the correct outcome, not a failure.

---

## 7. Unit conversion policy

A closed conversion table with **three classes and no crossing between them**:

| Class | Units |
|---|---|
| weight | g, kg, oz, lb |
| count | each, ct, dozen |
| volume | mL, L, floz, cup, pt, qt, gal |

- Within a class, conversion is exact arithmetic.
- **Across classes, there is no conversion.** If a portion is in `cup` and its product
  is sold by `lb`, that is a **gap with reason `no_conversion`** — never a guess.
- Density is therefore never needed, and the one input that does not exist in this
  system is never required.
- The 5.2% volume products (oils, vinegars, juices) are matched by volume portions;
  the 84.9% weight products by weight portions. Both are exact.
- Component recipes written in cups (FR-8) hit this wall. Deferred: recipe linkage is
  the smallest slice of the feature and is explicitly out of the first build.

---

## 8. Schema

Additive. No existing column changes type or meaning.

```sql
-- catalog
supplier_catalog_uploads(id, uploaded_at, source_label, file_count,
                         product_count, notes)

supplier_products(
  id, product_number text unique not null, description not null, brand,
  custom_description, pack_size not null,
  pack_count, pack_unit_size, pack_unit_size_max, pack_unit,
  pack_total_base numeric, base_unit text,
  uom, price numeric, price_basis text, case_price numeric,
  price_varies bool, price_as_of date, source_lists text[],
  category text, item_group text,
  first_seen_at, last_seen_at, is_active bool)

-- dishes
menu_dishes(
  id, name not null, menu_source, menu_section, description,
  upcharge numeric, base_price numeric, serves int, min_order int,
  season text, effective_start date, effective_end date,
  status text check (status in ('draft','confirmed')), confirmed_at,
  unique(name, menu_source, season))

dish_ingredients(
  id, dish_id -> menu_dishes on delete cascade,
  ingredient_name not null, portion_qty numeric not null,
  portion_unit text not null check (portion_unit in
    ('oz','lb','ct','each','floz')),
  basis text check (basis in ('per_person','per_batch')),
  component_recipe_id -> workbook_sheets, sort_order, status)

-- mappings (confirm once, reuse forever)
ingredient_products(
  id, ingredient_name text unique not null,
  product_id -> supplier_products,
  waste_factor numeric default 1.0, confirmed_at, confirmed_by)

beo_dish_matches(
  id, source_text text unique not null, dish_id -> menu_dishes,
  is_ignored bool default false, confirmed_at)

-- extend the existing order list, additively
alter table event_order_items add column
  product_id uuid references supplier_products,
  raw_qty numeric, raw_unit text,
  order_qty numeric, order_unit text,
  unit_cost numeric, line_cost numeric,
  is_gap boolean not null default false, gap_reason text;
```

`is_ordered`, `is_manual`, `note`, `sort_order` and realtime all survive untouched.
(NFR-6, FR-19)

RLS: open, office-only in the UI, matching every other table in this app. No new auth
ceremony. (NFR-5)

---

## 9. Phasing

| Phase | Work | Verified by |
|---|---|---|
| **P0** | Gemini upgrade off `gemini-3-flash-preview` (11 sites). **Its own change, shipped first** — it moves BEO parsing too. | BEO re-parse across all 5 packets; not two back-to-back runs |
| **P1** | Catalog ingestion + product search UI | Upload the 13 files → exactly 1,381 products, 394 varies, 6 unpriced |
| **P2** | Menu ingestion → `menu_dishes` drafts + confirm UI | Custom Buffets + Plated Dinners fully confirmed |
| **P3** | `dish_ingredients` drafting + `ingredient_products` mapping | Three dishes hand-checked against the arithmetic |
| **P4** | `beo_dish_matches` + runtime arithmetic + order list UI | **Same BEO twice, days apart, byte-identical** |
| **P5** | Recipe cost refresh (FR-21) | Spot-check against catalog |

P1 is independently useful and blocks nothing else. P0 can run in parallel with it.

---

## 10. Risks

1. **Confirmation volume (highest).** 250–300 dishes plus their ingredients plus
   product mappings. Mitigation: phase by menu (§5), and make the confirm UI
   keyboard-driven with bulk-accept. If the UI is slow, the feature dies here.
2. **BEO description lines are free text.** Typos and rewordings each create a new
   `source_text`. Mitigation: aggressive normalisation, editable matches, and a view
   of unmatched lines sorted by frequency.
3. **Per-BEO case rounding over-buys** across events (Q6 — accepted by scope choice).
4. **Menu drift.** The menus were rewritten once already; a rewrite invalidates
   confirmed dish specs. Mitigation: dishes are versioned by `(name, menu_source,
   season)` and re-confirmed rather than deleted.
5. **Price staleness.** Every order total must render "prices as of <date>" and flag
   `price_varies` lines. With highest-wins the total is a **conservative ceiling**,
   not an estimate — say so in the UI.

---

## 11. Open questions

Non-blocking; none stop P0 or P1.

- **Q4 raw vs finished weight** — `waste_factor` is in the schema, defaulted to 1.0
  and ignored until you want it.
- **Q5 overage buffer** — same: a per-dish or global percentage, off by default.
- **Q7 refresh cadence** — resolved as "make staleness visible, don't pick a calendar".
- **Q8 off-menu BEO dishes** — resolved: gap row, never a guess.
- **New:** should `event_order_items` keep a price snapshot per generation, so an old
  order list doesn't silently re-cost when the catalog refreshes? Recommend yes —
  `unit_cost`/`line_cost` are stored, not computed on read, which does this already.
