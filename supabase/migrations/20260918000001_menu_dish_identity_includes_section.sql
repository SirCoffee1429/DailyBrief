-- menu_dishes identity must include menu_section.
--
-- Found by drafting the remaining 6 menus on 2026-09-18: Breakfast read 22 dishes and
-- stored 21, Seasonal-Fall read 27 and stored 26. Both losses were real, and both were
-- the same cause — a dish name that legitimately appears TWICE on one menu, in two
-- sections, at two different prices:
--
--   Breakfast  "Yogurt Parfait Bar"   Fruit & Yogurt  $10/ea, min 12
--                                     Custom Breakfast Buffet  +$6 upgrade
--   Fall       "Shaved Brussels Sprout & Honeycrisp Apple Salad"
--                                     Starter Course (plated)
--                                     Buffet Salad
--
-- Under the old key (name, menu_source, season) those are one row, so the RPC's own
-- payload dedupe — which exists to stop ON CONFLICT throwing "cannot affect row a
-- second time" — silently dropped whichever lost the tie-break. Silent, because the
-- dedupe cannot tell a duplicate READING of one dish from two genuinely different
-- dishes that share a name. Only the read-vs-inserted counters showed it at all.
--
-- Adding menu_section splits those correctly while still collapsing the case the
-- dedupe was built for: the cold hors d'oeuvres that repeat verbatim on both pages do
-- so under the SAME section heading, so they remain one row.
--
-- The cost, stated plainly: identity now depends on a model-generated field, so if a
-- later re-draft renames a section ("Entrées" vs "Entrees") it inserts a second row
-- instead of updating the first. That is a duplicate a human can see and discard,
-- which is strictly better than a dish that silently disappears. Widening a unique key
-- can never conflict existing rows, so this is safe on the 124 already confirmed.

alter table public.menu_dishes
    drop constraint if exists menu_dishes_identity;

alter table public.menu_dishes
    add constraint menu_dishes_identity
    unique nulls not distinct (name, menu_source, menu_section, season);

create or replace function public.upsert_menu_dish_drafts(p_dishes jsonb)
returns table (inserted int, updated int, skipped_confirmed int)
language plpgsql
as $$
begin
    return query
    with incoming as (
        select
            trim(x.name)                                   as name,
            trim(x.menu_source)                            as menu_source,
            nullif(trim(coalesce(x.menu_section, '')), '') as menu_section,
            nullif(trim(coalesce(x.description, '')), '')  as description,
            x.source_page, x.upcharge, x.base_price, x.price_unit,
            x.serves, x.min_order,
            nullif(trim(coalesce(x.season, '')), '')       as season
        from jsonb_to_recordset(p_dishes) as x(
            name text, menu_source text, menu_section text, description text,
            source_page int, upcharge numeric, base_price numeric, price_unit text,
            serves int, min_order int, season text
        )
        where coalesce(trim(x.name), '') <> ''
          and coalesce(trim(x.menu_source), '') <> ''
    ),
    -- Deduped on the constraint's own key, so this collapses only a dish read twice
    -- from the same section — never two same-named dishes from different sections.
    deduped as (
        select distinct on (name, menu_source, menu_section, season) *
        from incoming
        order by name, menu_source, menu_section, season, source_page
    ),
    written as (
        insert into public.menu_dishes (
            name, menu_source, menu_section, description, source_page,
            upcharge, base_price, price_unit, serves, min_order, season
        )
        select
            name, menu_source, menu_section, description, source_page,
            upcharge, base_price, price_unit, serves, min_order, season
        from deduped
        on conflict on constraint menu_dishes_identity do update set
            description  = excluded.description,
            source_page  = excluded.source_page,
            upcharge     = excluded.upcharge,
            base_price   = excluded.base_price,
            price_unit   = excluded.price_unit,
            serves       = excluded.serves,
            min_order    = excluded.min_order,
            updated_at   = now()
        where public.menu_dishes.status = 'draft'
        returning (xmax = 0) as was_insert
    )
    select
        count(*) filter (where w.was_insert)::int,
        count(*) filter (where not w.was_insert)::int,
        ((select count(*) from deduped) - (select count(*) from written))::int
    from written w;
end;
$$;
