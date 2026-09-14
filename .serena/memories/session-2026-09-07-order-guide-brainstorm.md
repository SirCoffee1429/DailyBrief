# Session 2026-09-07 — Supplier Order Guide in BEO Order Lists (brainstorm only)

`/sc:brainstorm`. **Requirements discovery only — no code, no schema, nothing deployed.**
Output: `claudedocs/requirements_beo_order_guide_2026-09-07.md`.

## The ask
Feed the food supplier's order guide into the existing "generate order from BEO" and
prep-list features so lists pull from real purchasable items, with pricing and quantity
scaled to guest count.

## Findings that reshaped it (verified, not assumed)
- **Recipes have no yield.** 494 `workbook_sheets`: 1 says "yield", **0 say "serves"**.
  Template = row 1 `RECIPE:`|name, row 2 `Ingredients|Quantity|Measure|Unit Cost|Total
  Cost`, rows 3–23 ingredients, row 24 `Assembly:`, rows 25–32 method. Absolute batch
  amounts with no denominator → cannot scale to a headcount.
- **Dish-level recipe coverage ≈ zero.** Ryan had just rewritten the whole catering menu;
  library holds *components* (sweet & sour sauce, mushroom duxelles), never whole dishes.
  He picked "scale from recipes" believing coverage existed; his own next answer disproved
  it, so the design changed instead of proceeding on the stated pick.
- **411/494 sheets already carry `Unit Cost`/`Total Cost`** → competing cost source.
- **Catalog only, no purchase history** → quantities must be derived, never recalled.
- **Gemini stale:** 9 sites on `gemini-3-flash-preview` (preview build), +1
  `gemini-2.5-flash`, +1 `gemini-3.1-pro-preview`. Google GA flash line is at **3.8**.

## Core decision
**Inference moves OUT of the per-BEO path.** The catering menu is finite and
owner-authored, so each dish is defined once (AI drafts → Ryan confirms → stored). After
that, generating an order from a BEO is **pure arithmetic, no model call** — deterministic
and auditable. Same seed-and-confirm pattern for all four one-time inputs: catalog upload,
dish specs, ingredient→product mapping, recipe yields.

This is the material difference from the 2026-07-17 scrapped feature, which ran inference
on every BEO and so churned run-to-run. Acceptance criterion: same BEO twice, days apart,
byte-identical output.

## Ryan's decisions
Catalog-only via CSV/Excel upload · wants real product names + cost total + guest-count
quantity + pack/case rounding · quantity = mix of "portion rule you set" and "AI infers",
on a newer Gemini · product matching = AI proposes, confirm once, stored forever · scope
stays **per-BEO** (no cross-event roll-up) · dish ingredient may **point at a component
recipe** · prep list **out of scope for v1** · catalog price wins over recipe cost and
refreshes it.

## Open — blocks design
- **Unit conversion is the top risk.** Recipes use `Cups`/`T`; catalogs sell by `lb` and
  `50# case`. Volume→weight needs **density per ingredient**, which exists nowhere here.
  Left unresolved deliberately — this is the class of hidden complexity that sank July.
- Need two files from Ryan: **supplier order guide export** and **catering menu**.
- Non-blocking: raw vs finished weight, overage buffer, per-BEO case rounding over-buys
  across events, catalog re-upload cadence, off-menu BEO dishes.

## Housekeeping
- CHANGES.md 493 → 463 (two oldest detailed entries 08-19/08-24 condensed into Archive).
- CLAUDE.md 200 → 199 (added recipe-template + model-staleness facts; merged
  "Key IDs" into "What This App Is"; merged Change Tracking + Session Init; fixed stale
  "two types of users" → kitchen/FOH/office).
- **This session committed nothing** (docs only). `main` is at `a3313c1`, in sync with
  `origin/main`. **Correction:** I twice claimed the 2026-09-06 qty-chip work was still
  uncommitted — it was not; `a3313c1` contains `index.css` + `EventsBanquetsPage.jsx`.
  I trusted the stale MEMORY.md line instead of running `git log`. Verify git state from
  git, never from a memory note.
