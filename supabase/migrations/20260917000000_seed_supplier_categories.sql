-- Categorisation for the supplier catalog.
--
-- The raw order guide exports carry no category — only the AI-built master item list
-- does, filing all 1,381 products across 20 sheets with an `Item Group` column. Catalog
-- ingestion is deterministic and takes the raw exports only (design §4), so seeding
-- categories is a SEPARATE, explicit act rather than part of a refresh.

-- One statement instead of ~352 round trips (one per category/item_group pair), and
-- atomic: a failure leaves the catalog wholly unseeded rather than half-seeded.
--
-- Fills ONLY rows where category is null. `category` is meant to be sticky — set once,
-- never recomputed — so re-running this can never overwrite a value someone curated.
-- The skipped count is returned rather than swallowed, so "nothing happened" is visible
-- instead of looking like success.
create or replace function public.seed_supplier_categories(rows jsonb)
returns table (seeded integer, skipped integer, unmatched integer)
language plpgsql
as $$
declare
    v_seeded integer;
    v_matched integer;
    v_total integer;
begin
    select jsonb_array_length(rows) into v_total;

    update public.supplier_products p
       set category   = s.category,
           item_group = s.item_group
      from jsonb_to_recordset(rows)
        as s(product_number text, category text, item_group text)
     where p.product_number = s.product_number
       and p.category is null;
    get diagnostics v_seeded = row_count;

    select count(*) into v_matched
      from jsonb_to_recordset(rows) as s(product_number text, category text, item_group text)
      join public.supplier_products p on p.product_number = s.product_number;

    return query select v_seeded, (v_matched - v_seeded)::integer, (v_total - v_matched)::integer;
end;
$$;

-- Backs the category filter on the catalog page. Returning 20 rows beats shipping all
-- 1,381 products to the browser just to build a dropdown.
create or replace function public.supplier_categories()
returns table (category text, product_count bigint)
language sql
stable
as $$
    select category, count(*)
      from public.supplier_products
     where category is not null
     group by category
     order by category;
$$;
