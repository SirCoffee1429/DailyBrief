-- The catalog product behind each order-list item, so "Generate from BEO" shows what the
-- kitchen actually buys (product number, pack size, price) instead of a bare name.
--
-- Filled at generate time from the confirmed ingredient_products match for the item's name,
-- or picked by hand on the order list. A hand pick belongs to that BEO's row only; it does
-- not change the ingredient's match for every dish.
--
-- This is the product_id column design_beo_order_guide_2026-09-15.md §8 planned for P4; the
-- quantity/cost columns it lists come later. ON DELETE SET NULL: the catalog is rebuilt from
-- PFG exports, and a dropped product must not delete someone's order list line.

alter table public.event_order_items
    add column if not exists product_id uuid references public.supplier_products(id) on delete set null;
