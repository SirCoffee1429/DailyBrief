-- What the kitchen actually buys, from Performance Foodservice's "Inventory Worksheet"
-- purchase-history export (one row per product: the LAST purchase's quantity and date).
--
-- Why: the ingredient -> product matcher (draft-dish-specs, products mode) chose from all
-- 1,381 catalog products with no idea which ones the club orders, so it could pick a
-- product nobody has ever bought. With a last-purchase date it can prefer what is bought,
-- and a human picking by hand sees it too.
--
-- Deliberately NOT taken from this export:
--   * PRICES. Its Price column is a bare number, and for catch-weight items it is the
--     PER-POUND price with no "/lb" marker (Parmesan wheel 5.38 against a $107.60 case).
--     Read as a case price that is 20-50x too cheap — the exact bug case_price derivation
--     exists to prevent. Prices keep coming from the order-guide upload only.
--   * CATEGORY. Its PFG category ("GROCERY DRY") is a different scheme from the master
--     list's categories already on the catalog.

alter table public.supplier_products
    add column if not exists last_purchased_on date,
    add column if not exists last_purchase_qty numeric,
    add column if not exists last_purchase_uom text;

-- Records one purchase-history file. Atomic, like seed_supplier_categories.
--
--   * A product already in the catalog gets its last purchase, but ONLY if the file's date
--     is not older than the one stored — re-loading an older export can never move "last
--     bought" backwards.
--   * A product the file has but the catalog lacks is ADDED with NO price (see above), so
--     it shows as "No price" until the next order-guide upload prices it. Its pack fields
--     are parsed in the browser by the same parsePackSize the catalog upload uses.
--   * Nothing else on an existing product is touched: not price, pack, category or lists.
create or replace function public.record_purchase_history(p_rows jsonb)
returns table (updated integer, kept_newer integer, inserted integer, total integer)
language plpgsql
set search_path = public
as $$
declare
    v_total    integer;
    v_matched  integer;
    v_updated  integer;
    v_inserted integer;
begin
    select jsonb_array_length(p_rows) into v_total;

    select count(*) into v_matched
      from jsonb_to_recordset(p_rows) as s(product_number text)
      join public.supplier_products p on p.product_number = s.product_number;

    update public.supplier_products p
       set last_purchased_on = s.last_purchased_on,
           last_purchase_qty = s.last_purchase_qty,
           last_purchase_uom = s.last_purchase_uom
      from jsonb_to_recordset(p_rows)
        as s(product_number text, last_purchased_on date, last_purchase_qty numeric, last_purchase_uom text)
     where p.product_number = s.product_number
       and (p.last_purchased_on is null or s.last_purchased_on >= p.last_purchased_on);
    get diagnostics v_updated = row_count;

    insert into public.supplier_products (
        product_number, description, brand, custom_description, pack_size,
        pack_count, pack_unit_size, pack_unit_size_max, pack_unit, pack_total_base, base_unit,
        uom, source_lists, last_purchased_on, last_purchase_qty, last_purchase_uom
    )
    select s.product_number, s.description, s.brand, s.custom_description, s.pack_size,
           s.pack_count, s.pack_unit_size, s.pack_unit_size_max, s.pack_unit, s.pack_total_base, s.base_unit,
           s.uom, array['Purchase History'], s.last_purchased_on, s.last_purchase_qty, s.last_purchase_uom
      from jsonb_to_recordset(p_rows) as s(
               product_number text, description text, brand text, custom_description text, pack_size text,
               pack_count numeric, pack_unit_size numeric, pack_unit_size_max numeric, pack_unit text,
               pack_total_base numeric, base_unit text, uom text,
               last_purchased_on date, last_purchase_qty numeric, last_purchase_uom text)
     where not exists (select 1 from public.supplier_products p where p.product_number = s.product_number)
    on conflict (product_number) do nothing;
    get diagnostics v_inserted = row_count;

    return query select v_updated, (v_matched - v_updated)::integer, v_inserted, v_total;
end;
$$;

-- The mapping review shows when the chosen product was last bought, so a pick of
-- something never ordered stands out. Same definition as before plus one column at the
-- end. WITH (security_invoker = on) MUST be repeated: CREATE OR REPLACE VIEW resets the
-- view's options to whatever this clause lists (proven 2026-09-27).
create or replace view public.ingredient_usage with (security_invoker = on) as
    select
        u.ingredient_name,
        u.dish_count,
        u.units,
        ip.status        as mapping_status,
        ip.product_id,
        ip.ai_note,
        sp.product_number, sp.description as product_description, sp.brand, sp.pack_size,
        sp.pack_count, sp.pack_total_base, sp.base_unit, sp.case_price, sp.price_varies,
        sp.category,
        sp.last_purchased_on
      from (
        select di.ingredient_name,
               count(distinct di.dish_id)::int                             as dish_count,
               array_agg(distinct di.portion_unit order by di.portion_unit) as units
          from public.dish_ingredients di
          join public.orderable_menu_dishes d on d.id = di.dish_id
         group by di.ingredient_name
      ) u
      left join public.ingredient_products ip on ip.ingredient_name = u.ingredient_name
      left join public.supplier_products sp on sp.id = ip.product_id;
