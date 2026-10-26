# Session 2026-10-19 → 10-26: P4 yield design (parked) → order list shows products

## Done
- `/sc:brainstorm` P4 slice 1 → `claudedocs/requirements_p4_unit_conversion_2026-10-19.md` (case yield, usable,
  pack-count path removed, re-pick clears, mixed-unit names respecced).
- Owner data fixes 10-20/10-24: celery → #865031, cayenne → #877906, pickles pail correct; breadsticks → each,
  corn syrup → floz, three Bourbon Pecan Pie specs rewritten (9-inch pie).
- `/sc:design` → `claudedocs/design_p4_case_yield_2026-10-25.md`. Re-measured: 2,698 lines, 517/101/270 need a yield,
  88 dishes cost fully (76 after the pack-count path goes). Q-1 = no drafts (owner).
- **10-25 owner re-sequenced:** the goal was "Generate from BEO" showing the actual product. Yields PARKED.
  Built A: migration `20261025000000_event_order_items_product.sql` (applied as `event_order_items_product`),
  `lib/orderProducts.js`, `components/ProductPicker.jsx` (moved from IngredientProducts), EventsBanquetsPage
  product line + change/pick product (hand pick = that BEO row only).
- 10-26 owner chose the prep-word fallback ("option 2"). Homecoming Dinner: 22/28 → 26/28 (shipped module, browser).

## Open
- **B next:** BEO lines → confirmed dishes (`beo_dish_matches`) → confirmed specs → products.
- Prep-word traps: `diced tomatoes` → fresh vine ripe, `shredded mozzarella` → fresh pearls. Owner may drop "diced".
- Phone width of the order-list product line not checked (window wouldn't resize).
- Shipping A: alone from origin/main or push all of main — owner's call ("decide later"). Main 64 ahead after this save.
- Then: implement the parked yield design.
- Uncommitted on purpose: `supabase/.temp/cli-latest`, Vendor Data worksheet,
  `.serena/memories/session-2026-09-27-schedule-week-redate.md`.
