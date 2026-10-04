-- The AI product matcher reads each ingredient's dishes to tell what it is FOR. Given only
-- "Bacon-Wrapped Scallops", it picked a pre-made bacon-wrapped scallop appetizer for
-- "scallops" in 2 of 3 runs — although that dish's spec orders bacon on its own line, so
-- the pick would buy the bacon twice. A prompt rule alone did not stop it; the model has
-- to SEE the bacon. So each dish entry gains `with`: the dish's other ingredient names.
--
-- Same definition as 20261001000000 with that one key added inside the `dishes` jsonb
-- (no new column), and WITH (security_invoker = on) repeated — CREATE OR REPLACE resets
-- the view's options. The Ingredient Products page ignores the extra key.
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
                   'basis',  d.spec_basis,
                   'with',   coalesce((
                       select jsonb_agg(o.ingredient_name order by o.ingredient_name)
                         from public.dish_ingredients o
                        where o.dish_id = di.dish_id
                          and o.ingredient_name <> di.ingredient_name
                   ), '[]'::jsonb)
               ) order by d.menu_source, d.name)                          as dishes
          from public.dish_ingredients di
          join public.orderable_menu_dishes d on d.id = di.dish_id
         group by di.ingredient_name
      ) u
      left join public.ingredient_products ip on ip.ingredient_name = u.ingredient_name
      left join public.supplier_products sp on sp.id = ip.product_id;
