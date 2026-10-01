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

## Next
Owner drafts more menus; then run "Match products" on Ingredient Products and review the
picks (watch for NOT BOUGHT BEFORE notes). Purchase-history xlsx left untracked (owner's call).
