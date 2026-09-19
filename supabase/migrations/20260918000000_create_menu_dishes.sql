-- Catering menu dishes: the vocabulary a BEO line will eventually be matched to.
--
-- Phase P2 of claudedocs/design_beo_order_guide_2026-09-15.md. Only menu_dishes is
-- created here. dish_ingredients (P3), ingredient_products (P3) and beo_dish_matches
-- (P4) belong to later phases and are not speculated on now.
--
-- The 8 menu PDFs are hand-designed marketing layouts: multi-column, with the price
-- column extracting as a detached block of its own (Breakfast prints eight dish names
-- and then eight prices, in separate runs), and ligatures mangled by every text layer
-- reader. So a dish is DRAFTED by a multimodal model that can see the page and then
-- CONFIRMED by a human. Non-determinism is safe here precisely because it runs once
-- behind that gate and never again — the per-BEO path stays arithmetic.

create table if not exists public.menu_dishes (
    id              uuid primary key default gen_random_uuid(),

    name            text not null,
    -- The menu the dish came off, e.g. 'Custom Buffets'. Part of identity: the same
    -- dish name legitimately appears on more than one menu at a different price.
    menu_source     text not null,
    -- The heading it sat under, e.g. 'Premium Entrées', 'Buffet Sides'.
    menu_section    text,
    -- The sub-line under the name, listing components or choices.
    description     text,
    -- The page it was drafted from, so a reviewer can find it in the PDF rather than
    -- hunting 18 pages for one line.
    source_page     int,

    -- Two DIFFERENT prices, and conflating them prints a wrong number. '+$5' is an
    -- upcharge on a package that already has a per-person base; '$7' / '$29.00' /
    -- '$200' is the dish's own price standing alone.
    upcharge        numeric,
    base_price      numeric,
    -- What base_price BUYS, which the menus state four different ways: '$8/ea',
    -- '$18/person', '$30/doz', '$90/tray', and '$200' for a platter that serves 20.
    -- Without this a base_price is ambiguous and the P4 arithmetic has to guess.
    price_unit      text check (price_unit in ('each','person','dozen','tray','piece')),

    -- The yield the recipe library does not have: 'Serves 20', 'Minimum 20
    -- pieces/type', 'min. order 12'. Section-level minimums apply to every dish
    -- beneath them and are copied down at draft time.
    serves          int,
    min_order       int,

    -- 'fall' (Sept-Nov) or 'winter' (Dec-Feb) off the seasonal menus; null on the
    -- year-round ones. Deliberately NOT accompanied by effective_start/effective_end
    -- date columns: these seasons recur every year by MONTH, so an absolute date range
    -- expires. Resolving a BEO's date to a season is P4's job and P4 can add what it
    -- actually needs.
    season          text check (season in ('fall','winter')),

    -- A draft is the model's reading of the page. Nothing downstream may rely on a
    -- dish until a human has confirmed it; an unconfirmed dish surfaces as a gap.
    status          text not null default 'draft' check (status in ('draft','confirmed')),
    confirmed_at    timestamptz,

    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    -- NULLS NOT DISTINCT (pg15+) is required, not cosmetic: season is null on the six
    -- year-round menus, and under the default NULLS DISTINCT every re-parse of those
    -- menus would insert a full duplicate set instead of conflicting.
    constraint menu_dishes_identity unique nulls not distinct (name, menu_source, season)
);

-- The review UI reads by menu and by status; both are small, sorted lists.
create index if not exists menu_dishes_status_idx
    on public.menu_dishes (status, menu_source, menu_section);

-- Re-drafting a menu must never overwrite a dish someone already confirmed. Expressed
-- here in ONE statement rather than in the caller, for two reasons: a per-dish loop
-- from the browser can leave a menu half-written, and a rule that lives in the caller
-- is a rule the next caller forgets. Same shape as seed_supplier_categories.
create or replace function public.upsert_menu_dish_drafts(p_dishes jsonb)
returns table (inserted int, updated int, skipped_confirmed int)
language plpgsql
as $$
begin
    return query
    with incoming as (
        select
            trim(x.name)                                as name,
            trim(x.menu_source)                         as menu_source,
            nullif(trim(coalesce(x.menu_section, '')), '') as menu_section,
            nullif(trim(coalesce(x.description, '')), '')  as description,
            x.source_page, x.upcharge, x.base_price, x.price_unit,
            x.serves, x.min_order,
            nullif(trim(coalesce(x.season, '')), '')    as season
        from jsonb_to_recordset(p_dishes) as x(
            name text, menu_source text, menu_section text, description text,
            source_page int, upcharge numeric, base_price numeric, price_unit text,
            serves int, min_order int, season text
        )
        where coalesce(trim(x.name), '') <> ''
          and coalesce(trim(x.menu_source), '') <> ''
    ),
    -- The same dish printed twice in one packet (the cold hors d'oeuvres repeat
    -- verbatim on both pages) would make ON CONFLICT fail with "cannot affect row a
    -- second time", so the payload is deduped on the constraint's own key first.
    deduped as (
        select distinct on (name, menu_source, season) *
        from incoming
        order by name, menu_source, season, source_page
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
            menu_section = excluded.menu_section,
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

-- Backs the review UI's menu picker. A grouped count, rather than pulling every dish
-- to the browser to tally it there.
create or replace function public.menu_dish_sources()
returns table (menu_source text, season text, total int, drafts int, confirmed int)
language sql
stable
as $$
    select
        d.menu_source,
        d.season,
        count(*)::int,
        count(*) filter (where d.status = 'draft')::int,
        count(*) filter (where d.status = 'confirmed')::int
    from public.menu_dishes d
    group by d.menu_source, d.season
    order by d.menu_source, d.season;
$$;

-- RLS: permissive anon, matching supplier_products and every other table in this app
-- (anon key only, gated by the client-side office password). No new auth ceremony.
alter table public.menu_dishes enable row level security;

drop policy if exists allow_all_menu_dishes on public.menu_dishes;
create policy allow_all_menu_dishes
    on public.menu_dishes
    for all
    using (true)
    with check (true);
