# Session 2026-09-30 — purchase history feeds ingredient matching

## Why
P3's matcher (draft-dish-specs, products mode) picked from all 1,381 catalog products blind.
Owner pulled PFG's purchase history ("Inventory Worksheet" export, Vendor Data/) and asked how
to use it. Owner chose: matcher + picker prefer bought, load the file, PFG is the only vendor,
NO prices from it.

## Findings before building
- The catalog ALREADY tagged 728 products with source_list "Purchase History" (09-05
  "Product List Report" export, no dates) — unused by the matcher until now.
- New export = 631 products, ONE row each with the LAST purchase only ("13 CS 9/28/2026") — no
  frequency. 611 in catalog, 20 not. Third layout: header 2 rows lower; sheet "Inventory
  Worksheet Report".
- PRICE TRAP: Price is a bare number; for catch-weight it is PER-LB, unmarked (Parmesan 5.38
  vs $107.60 case; new beef tenderloin case "11.85"). Never read it as a case price.

## Built (all verified)
- Migration 20260930000000: supplier_products.last_purchased_on/qty/uom; RPC
  record_purchase_history (date never moves backwards; adds missing products UNPRICED;
  touches nothing else); ingredient_usage view + last_purchased_on (WITH security_invoker kept).
- catalogParse.js parsePurchaseHistory/parseLastPurchase (header FOUND; date built from its
  digits, no Date object). PurchaseHistoryPanel on /office/catalog. formatDateOnly in dates.js.
- IngredientProducts: picker orders by last_purchased_on desc nulls last (before limit 25),
  shows "bought <date>"; mapped product shows last purchase or red "no purchase on record".
- draft-dish-specs v3 (CLI deploy): bought products first + "BOUGHT <date>" tag; rule 3 prefers
  bought, else note starts "NOT BOUGHT BEFORE:". NOT yet run on real ingredients.
- Owner loaded the file: 631 / 611 updated / 20 added. Table: 1,401 products, 631 dated,
  0 prices changed, 0 new priced.

## Lessons
- CLI deploy stores COMPILED JS → deployed-vs-repo byte diff fails; grep the download instead.
- deno check fails on an openai type in Supabase's edge-runtime.d.ts (environment, not code).

## 2026-10-01 — dishes shown on Ingredient Products (commit 1080aa6)
- Owner: "I need it to show me what dish its for so I know what product to match it with."
- Migration 20261001000000: ingredient_usage gains `dishes` jsonb (name, menu, season, qty,
  unit, basis), appended; WITH security_invoker repeated. Verified 122/122 rows len(dishes) =
  dish_count. Row shows 4 dishes + "+N more". BASIS_LABEL moved to orderUnits.js (shared with
  DishSpecs). Owner checked it in the browser (office password gate: owner unlocks, not me).
- Progress (owner): 42/364 dishes specced (Hors d'Oeuvres, Platters, Themed Buffets), 14
  confirmed; 116/122 ingredient matches confirmed, 6 drafts.
- Suggested, not built: give the AI matcher the same dish context ("cheese" for a board vs a dip).

## Next
**AGREED NEXT TASK (owner, 10-01): pass each ingredient's dishes to the AI matcher** —
draft-dish-specs products mode reads ingredient_usage (`ingredient_name, units,
mapping_status`); add `dishes` to that select and to each ingredient line in the prompt
(name + menu + portion), keeping the batch of 40 inside the 130s deadline. Redeploy (CLI from
disk; verify by grepping the download — it is compiled JS). 6 mappings are still drafts.
Owner drafts more menus; then run "Match products" on Ingredient Products and review the
picks (watch for NOT BOUGHT BEFORE notes). Purchase-history xlsx left untracked (owner's call).
