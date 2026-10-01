-- The ingredient -> product review needs to know WHICH dishes use an ingredient, not just
-- how many: "cheese" for a Charcuterie Board and "cheese" for a Buffalo Chicken Dip are
-- bought differently, and the reviewer picks the product by what the dish is.
--
-- Adds `dishes` to ingredient_usage: one entry per dish using the ingredient, with its
-- menu and the portion it uses per one unit of the dish's spec basis. Same definition as
-- 20260930000000 plus that one column at the END (CREATE OR REPLACE VIEW can only append),
-- and WITH (security_invoker = on) repeated — CREATE OR REPLACE resets the view's options.
--
-- No duplicates are possible: dish_ingredients is unique on (dish_id, ingredient_name).
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
        sp.last_purchased_on,
        u.dishes
      from (
        select di.ingredient_name,
               count(distinct di.dish_id)::int                             as dish_count,
               array_agg(distinct di.portion_unit order by di.portion_unit) as units,
               jsonb_agg(jsonb_build_object(
                   'name',   d.name,
                   'menu',   d.menu_source,
                   'season', d.season,
                   'qty',    di.portion_qty,
                   'unit',   di.portion_unit,
                   'basis',  d.spec_basis
               ) order by d.menu_source, d.name)                          as dishes
          from public.dish_ingredients di
          join public.orderable_menu_dishes d on d.id = di.dish_id
         group by di.ingredient_name
      ) u
      left join public.ingredient_products ip on ip.ingredient_name = u.ingredient_name
      left join public.supplier_products sp on sp.id = ip.product_id;
