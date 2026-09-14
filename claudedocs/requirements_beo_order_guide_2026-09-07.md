# Requirements — Supplier Order Guide in BEO Order Lists

**Date:** 2026-09-07
**Status:** Requirements only. No architecture, no schema, no code.
**Next step:** `/sc:design` for architecture, or `/sc:workflow` for implementation planning.

---

## 1. Goal

An order list generated from a BEO should name **real products you can actually
order**, in **quantities derived from the event's headcount**, **rounded to
orderable units**, with **cost per line and an event total** — sourced from the
order guide catalog exported from your food supplier.

Today `generate-order-items` emits free-text ingredient names ("russet potatoes")
with no quantity, no price, and no link to anything purchasable.

---

## 2. Discovery findings that changed the shape of this

Verified against the repo and prod DB, not assumed.

| # | Finding | Consequence |
|---|---|---|
| F1 | Recipe template has **no yield field**. 494 sheets: 1 says "yield", **0 say "serves"**. Structure is `RECIPE:` / header row / rows 3–23 ingredients / row 24 `Assembly:` / rows 25–32 method. | Absolute batch quantities with no denominator cannot be scaled to a headcount. Yield must be added before any recipe can scale. |
| F2 | **No whole dish is in the recipe library.** The catering menu was just rewritten and is largely new; existing recipes are *components* (sweet & sour sauce, mushroom duxelles), not dishes. | Recipe scaling cannot be the primary quantity mechanism. It is a component-level contributor. |
| F3 | **411 of 494 sheets already carry `Unit Cost` / `Total Cost`.** | Two competing cost sources. Decided: catalog is authoritative, and recipe costs get refreshed from it. |
| F4 | Catalog only — **no order history available**. | Every quantity must be *derived*, never *recalled*. No learning from what was actually bought. |
| F5 | 9 edge-function call sites on `gemini-3-flash-preview` (a preview build), plus one `gemini-2.5-flash` and one `gemini-3.1-pro-preview`. Google's GA flash line is now at **3.8**. | Model upgrade is a **prerequisite**, tracked separately (§7). |

---

## 3. Core design decision

**Move inference out of the per-BEO path.**

The catering menu is a finite list Ryan authored. So each dish is defined **once**
— AI drafts, human confirms, result is stored. After that, generating an order
from a BEO is **pure arithmetic**: no model call, deterministic, repeatable,
auditable.

This is the material difference from the portion-scaling feature built and
scrapped on 2026-07-17. That version ran inference on every BEO, so the answer
changed run to run and could not be verified — the same non-determinism
`CLAUDE.md` already warns about (*"Gemini churns across days even at
`temperature: 0`"*). Here the model runs once per dish, ever, behind an approval
gate.

### Four things defined once (AI-drafted → human-confirmed → stored)

1. **Supplier catalog** — uploaded from CSV/Excel export. No AI.
2. **Dish spec** — dish → ingredients/components → portion per person.
3. **Ingredient → catalog product mapping** — vector shortlist, AI picks, you confirm.
4. **Recipe yield** — only for component recipes a dish actually links to.

### Per-BEO runtime path (no AI)

```
BEO item
  → matched dish spec
  → headcount basis (pieces / each / Serves N × Qty — see reference_beo_order_basis)
  → raw ingredient quantity
  → convert to purchase unit
  → round to orderable pack/case
  → catalog price
  → line cost + event total
```

---

## 4. Functional requirements

### 4.1 Catalog ingestion
- **FR-1** Upload the supplier order guide as CSV/Excel, following the existing workbook/sales upload pattern.
- **FR-2** Capture per product at minimum: product name, item number, pack size, unit of measure, price.
- **FR-3** Re-uploading refreshes pricing on existing products without destroying confirmed ingredient mappings.
- **FR-4** Catalog products are searchable by a human, not only by AI.

### 4.2 Dish definition (one-time, up front)
- **FR-5** Ingest the catering menu and produce a dish list.
- **FR-6** For each dish, AI drafts its ingredient breakdown with a **per-person portion** and unit.
- **FR-7** Ryan reviews, edits, and confirms each dish. Nothing is used until confirmed.
- **FR-8** A dish ingredient may instead **point at an existing component recipe**, which expands via that recipe.
- **FR-9** For any linked recipe, AI proposes a yield ("this batch serves N"); Ryan confirms; the yield is stored on the recipe.
- **FR-10** Confirmed dish specs are editable later without regenerating from scratch.

### 4.3 Ingredient → product mapping
- **FR-11** For each ingredient, shortlist catalog candidates by vector similarity (reuse the existing pgvector / `gemini-embedding-001` infrastructure), have AI pick the best, and present it for confirmation.
- **FR-12** A confirmed mapping is stored and never re-asked.
- **FR-13** Ryan can override a mapping at any time, and can map to a product the AI never suggested.

### 4.4 Order list generation (per BEO)
- **FR-14** Generating an order list makes **no model call**. Same BEO in → same list out, every time.
- **FR-15** Quantity is derived from the BEO's order basis (`N pieces` / `each` / `Serves N`, each × the Qty column), not from a single event headcount.
- **FR-16** Each line shows the real catalog product name and item number.
- **FR-17** Each line shows the raw amount needed **and** the rounded orderable amount (e.g. "need 18 lb → 2 cases @ 10 lb").
- **FR-18** Each line shows extended cost; the list shows an event total.
- **FR-19** Existing behaviour survives: `is_ordered` toggles, manual items, per-item notes, dish grouping, realtime.
- **FR-20** A BEO dish with no confirmed spec is surfaced as an explicit gap, never silently dropped or silently guessed.

### 4.5 Recipe cost refresh
- **FR-21** Recipe `Unit Cost` / `Total Cost` are updated from catalog pricing where an ingredient is mapped.

---

## 5. Non-functional requirements

- **NFR-1 Determinism.** Per-BEO generation is arithmetic only. Two runs a week apart must agree.
- **NFR-2 Human gate.** No AI output reaches an order list without confirmation.
- **NFR-3 Never silently wrong.** Unmapped ingredients, missing dish specs, and missing yields are visible gaps, not zeros or guesses. (See `reference-supabase-silent-wrong-data` — this app has been burned by quietly-wrong numbers before.)
- **NFR-4 Bounded setup.** The up-front pass must be completable in one or two sittings, not open-ended.
- **NFR-5 Repo conventions.** Office-only, open RLS matching the rest of the app, no new auth ceremony. Quality gate is `npm run build` plus browser verification.
- **NFR-6 Additive.** Existing order-list behaviour must not regress.

---

## 6. Acceptance criteria

- [ ] Upload a real supplier export; products are searchable and priced.
- [ ] Run the up-front pass over the catering menu; every dish ends in a confirmed state.
- [ ] Generate an order list from a real BEO: every line names a real product with item number, a rounded orderable quantity, and a cost; the event total is present.
- [ ] Generate the **same** BEO twice, days apart — output is byte-identical.
- [ ] A dish deliberately left undefined appears as an explicit gap on the list.
- [ ] Re-upload the catalog with changed prices; costs update, confirmed mappings survive.
- [ ] Spot-check three dishes by hand against the arithmetic; numbers agree.
- [ ] `npm run build` passes.

---

## 7. Prerequisite, tracked separately

Upgrade the Gemini model off `gemini-3-flash-preview` across all 9 call sites
(plus the stray `gemini-2.5-flash` and `gemini-3.1-pro-preview`). **Do this as
its own change, before this feature** — it alters BEO parsing behaviour too, and
that needs to be evaluated on its own rather than confounded with a new feature's
first run.

---

## 8. Open questions

**Blocking — need answers or files before design:**

- **Q1 — Unit conversion is the top unresolved risk.** Recipes measure in `Cups` and `T`; catalogs sell by `lb` and `50# case`. Converting volume → weight needs a **density per ingredient**, which exists nowhere in this system today. Handle via a conversion table you maintain, AI-proposed-and-confirmed like everything else, or restrict portions to weight/count units only and avoid volume entirely?
- **Q2** — Can you provide the **supplier order guide export**? Need its real columns and roughly how many products.
- **Q3** — Can you provide the **catering menu** file? Its format determines how dishes are ingested, and how many dishes the up-front pass covers.

**Non-blocking, but decide before build:**

- **Q4** — Raw vs finished weight. Does a portion mean cooked yield, and do we apply a trim/shrinkage factor? (July's scrapped version modelled this; it added a lot of complexity.)
- **Q5** — Overage buffer. Do you want a waste/safety margin percentage on top of computed need?
- **Q6** — Case rounding is per-BEO by your scope choice. Three events each needing 4 lb of butter round to **three** cases, not one. Accept, or revisit the combined-view idea later?
- **Q7** — How often will you re-upload the catalog? Costs are only as fresh as the last upload — is the event total understood as an estimate?
- **Q8** — What should happen when a BEO names a dish that isn't on the catering menu at all?

---

## 9. Explicit non-goals for v1

- Prep list stays plain text (your call — keeps this tight and avoids re-opening July's scrapped work).
- No combined cross-event order roll-up; per-BEO only.
- No supplier API integration; file upload only.
- No learning from purchase history — that data doesn't exist.
- No automatic ordering or submission to the supplier.
