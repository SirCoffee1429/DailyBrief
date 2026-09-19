# Sessions 2026-09-17→19 — Order Guide P2 SHIPPED (menu ingestion + confirm UI)

`/sc:implement P2` → draft → owner confirmed 124 → remaining menus → two real bugs found
and fixed. **5 commits on `main`, NOT pushed** (pushing deploys to Vercel).

## What shipped
- `menu_dishes` + `upsert_menu_dish_drafts(jsonb)` + `menu_dish_sources()` +
  `orderable_menu_dishes` view. 3 migrations (20260918000000/000001, 20260919000000).
- `process-menu` edge function (deployed v2) — multimodal PDF → dish drafts.
- `/office/menus`: `MenuDishes.jsx`, `MenuUploadPanel.jsx`, `lib/menuDrafts.js`.

## State: 232 dishes = 121 orderable food + 3 price rules + 108 still to confirm
Confirmed: Custom Buffets 44, Plated Dinners 80. Drafted and awaiting confirm:
Breakfast 22, Hors d'Oeuvres 28, Platters 6, Seasonal-Fall 27, Seasonal-Winter 25.
**Quick Lunch Bites deliberately NOT loaded** — see Open below.

## Two bugs I introduced, both caught by verification not by luck
1. **Identity too narrow.** `(name, menu_source, season)` cannot hold a dish name that
   appears twice on ONE menu in two sections at two prices (Breakfast "Yogurt Parfait
   Bar" = $10/ea item AND +$6 buffet upgrade; Fall Brussels salad = plated starter AND
   buffet salad). The RPC's payload dedupe silently ate one of each. **Caught ONLY by the
   RPC returning `read` vs `inserted`** — the UI showed nothing. Key now includes
   `menu_section`. Re-draft recovered exactly 1 dish per menu.
2. **Case-sensitive UPDATE.** Flagging the price rules with an exact `IN` list hit 2 of 3:
   the PDF prints "additional dessert" lowercase, the model stored "Additional dessert".
   Caught by reading the result back, not by assuming the UPDATE worked.

## Model choice was MEASURED, and contradicts the repo default
`gemini-3-flash-preview` = 25s on a ONE-page PDF, blew the 130s gateway on 4 pages.
`gemini-2.5-flash` = 5 pages in 64s. Same conclusion `process-beo` reached 2026-05-30.
**Time a new PDF path on the LARGEST file — a 1-page smoke test hides per-page latency.**
This is NOT the cancelled P0 upgrade; do not re-propose that.

## Parse quality (verified dish-by-dish against the PDFs, not eyeballed)
Plated Dinners 80/80 exact, Custom Buffets 44/44 exact, every upcharge right (incl. `+$2.5`
and a malformed `+3`). Policy prose → 0 dishes. **Breakfast had 1 genuine error in 10
priced rows** (a croissant with no printed price got $9 from the row above) — found by
reading the RENDERED page, since the text layer can't settle a detached price column.
Left unfixed deliberately: a prompt tweak I can't prove across 8 menus is a guess.

## Verification technique that worked
Stickiness was proven on the case that CAN fail — a **draft** row carrying `is_price_rule`,
where the ON CONFLICT update actually runs (upcharge 4→99, page→3, flag held). Testing the
confirmed row would have proved nothing, since the status guard alone explains it.

## Open
- **`MenuUploadPanel.jsx` has never run.** Every menu was drafted by the harness calling
  the deployed function. Quick Lunch Bites was left unloaded so that path gets a real test
  instead of a no-op (the CategorySeedPanel trap from the previous session).
- Breakfast "Omelet Station" puts a $100 flat setup fee in `upcharge` (a per-person field)
  and sits under the wrong section.
- `upcharge` conflates intrinsic premium vs positional surcharge — see
  [[reference-buffet-upcharge-semantics]]. Needs package composition = pricing = out of
  v1 scope.
- **P3 next:** `dish_ingredients` + `ingredient_products`, drawing from
  `orderable_menu_dishes`.
