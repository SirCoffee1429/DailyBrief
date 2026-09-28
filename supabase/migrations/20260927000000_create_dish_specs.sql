-- Dish specs (what one serving of a dish is made of) and ingredient -> product mappings.
--
-- Phase P3 of claudedocs/design_beo_order_guide_2026-09-15.md. Same shape as P2: a
-- model DRAFTS, a human CONFIRMS, and nothing downstream may use a draft. The per-BEO
-- order list (P4) then becomes arithmetic over confirmed rows with no model call.
--
-- Owner decisions, 2026-09-27:
--   * House-made items are specced as RAW ingredients — what is actually bought.
--   * Themed-buffet packages get FLAT per-person ingredients covering every component
--     listed in their description; no dish-to-dish links.
--   * Flavour-choice dishes ("Espresso, Blueberry Lemon, Turtle, or Amaretto") are
--     specced as the shared BASE only, and spec_note says what was left out.
--
-- Deliberately NOT here: component_recipe_id (FR-8, recipe linkage — deferred by design
-- §7, component recipes are written in cups and hit the no-conversion wall) and
-- waste_factor (Q4 — portions are drafted AS PURCHASED instead, so no factor is needed
-- until the owner asks for one).

-- ---------------------------------------------------------------------------------
-- 1. The spec's own state lives on the dish.
--
-- A dish has ONE basis for all of its ingredients, and ONE review decision, so these
-- are dish columns rather than being repeated on every ingredient row. None of them is
-- in upsert_menu_dish_drafts' ON CONFLICT list, so re-drafting a menu cannot reset them.
-- ---------------------------------------------------------------------------------

alter table public.menu_dishes
    -- What ONE portion is a portion OF: the dish's selling unit. Buffet and plated
    -- dishes are per person, hors d'oeuvres per piece, bakery per dozen, a platter per
    -- tray. P4 multiplies the portions by the BEO's count of THIS unit.
    add column if not exists spec_basis text
        check (spec_basis in ('person', 'each', 'piece', 'dozen', 'tray', 'lb')),
    add column if not exists spec_status text not null default 'none'
        check (spec_status in ('none', 'draft', 'confirmed')),
    -- What the spec knowingly leaves out ("Flavour ingredients not included: espresso,
    -- lemon, blueberry"), so an under-costed dish says so instead of looking complete.
    add column if not exists spec_note text,
    add column if not exists spec_confirmed_at timestamptz;

-- The view was created with SELECT * before price_qty existed, and Postgres expands *
-- at creation time — so it has been silently missing price_qty (found 2026-09-27).
-- Re-running the same definition appends price_qty and the spec columns at the end.
create or replace view public.orderable_menu_dishes as
    select *
      from public.menu_dishes
     where status = 'confirmed'
       and is_price_rule = false;

-- ---------------------------------------------------------------------------------
-- 2. dish_ingredients — one row per ingredient per dish.
-- ---------------------------------------------------------------------------------

create table if not exists public.dish_ingredients (
    id              uuid primary key default gen_random_uuid(),
    dish_id         uuid not null references public.menu_dishes(id) on delete cascade,

    -- Lowercase and trimmed BY CONSTRAINT, not by convention: this is the join key to
    -- ingredient_products, and "Chicken Breast" vs "chicken breast" would silently make
    -- the same ingredient need mapping twice.
    ingredient_name text not null
        check (ingredient_name <> '' and ingredient_name = lower(btrim(ingredient_name))),

    -- AS PURCHASED, per one spec_basis unit of the dish.
    portion_qty     numeric not null check (portion_qty > 0),
    -- A closed list, so a spec that can never convert to a catalog pack cannot be
    -- created (design §7). 'ct' from the design is folded into 'each' — same thing.
    portion_unit    text not null check (portion_unit in ('oz', 'lb', 'floz', 'each')),

    sort_order      int not null default 0,
    created_at      timestamptz not null default now(),

    -- The same ingredient twice in one dish (butter in the crust AND the filling) is
    -- one merged row, or the arithmetic has to remember to sum it.
    constraint dish_ingredients_one_per_dish unique (dish_id, ingredient_name)
);

create index if not exists dish_ingredients_name_idx on public.dish_ingredients (ingredient_name);

-- ---------------------------------------------------------------------------------
-- 3. ingredient_products — each ingredient name mapped ONCE to a catalog product.
--
-- Confirm once, reuse forever (FR-12). product_id NULL on a CONFIRMED row is a real
-- answer — "not bought from this catalog" — and P4 shows it as a gap with that reason.
-- ---------------------------------------------------------------------------------

create table if not exists public.ingredient_products (
    ingredient_name text primary key
        check (ingredient_name <> '' and ingredient_name = lower(btrim(ingredient_name))),
    product_id      uuid references public.supplier_products(id),
    status          text not null default 'draft' check (status in ('draft', 'confirmed')),
    -- The model's one-line reason, shown beside its pick so a reviewer can see WHY it
    -- chose the 8 oz breast over the random-size one.
    ai_note         text,
    confirmed_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists ingredient_products_product_idx on public.ingredient_products (product_id);

-- ---------------------------------------------------------------------------------
-- 4. Writing a spec — ONE statement per dish, so a half-written ingredient list can
--    never be left behind by a browser that loses its connection mid-loop.
-- ---------------------------------------------------------------------------------

-- The human path: always writes, draft or confirmed. Editing a confirmed spec later is
-- FR-10 and must not need a regeneration.
create or replace function public.save_dish_spec(
    p_dish_id     uuid,
    p_basis       text,
    p_note        text,
    p_ingredients jsonb,
    p_status      text
)
returns void
language plpgsql
as $$
begin
    if p_status not in ('draft', 'confirmed') then
        raise exception 'status must be draft or confirmed, got %', p_status;
    end if;
    -- Price rules and unconfirmed dishes are not food (see is_price_rule's comment):
    -- giving one ingredients would order that food twice, so the database refuses.
    if not exists (select 1 from public.orderable_menu_dishes where id = p_dish_id) then
        raise exception 'dish % is not orderable (unconfirmed, or a price rule)', p_dish_id;
    end if;

    delete from public.dish_ingredients where dish_id = p_dish_id;

    insert into public.dish_ingredients (dish_id, ingredient_name, portion_qty, portion_unit, sort_order)
    select p_dish_id, lower(btrim(t.e->>'name')), (t.e->>'qty')::numeric, t.e->>'unit', (t.ord - 1)::int
      from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb)) with ordinality as t(e, ord);

    update public.menu_dishes
       set spec_basis        = p_basis,
           spec_note         = nullif(btrim(coalesce(p_note, '')), ''),
           spec_status       = p_status,
           spec_confirmed_at = case when p_status = 'confirmed' then now() end,
           updated_at        = now()
     where id = p_dish_id;
end;
$$;

-- The model's path: a batch of drafts, and a confirmed spec is NEVER overwritten —
-- the same protection upsert_menu_dish_drafts gives confirmed dishes.
create or replace function public.save_dish_spec_drafts(p_specs jsonb)
returns table (written int, skipped_confirmed int, skipped_not_orderable int)
language plpgsql
as $$
declare
    s   record;
    w   int := 0;
    sc  int := 0;
    sno int := 0;
    cur text;
begin
    for s in
        select * from jsonb_to_recordset(p_specs)
            as x(dish_id uuid, basis text, note text, ingredients jsonb)
    loop
        select d.spec_status into cur from public.orderable_menu_dishes d where d.id = s.dish_id;
        if not found then
            sno := sno + 1;
        elsif cur = 'confirmed' then
            sc := sc + 1;
        else
            perform public.save_dish_spec(s.dish_id, s.basis, s.note, s.ingredients, 'draft');
            w := w + 1;
        end if;
    end loop;
    return query select w, sc, sno;
end;
$$;

-- Mapping drafts: a confirmed mapping is never overwritten (FR-12).
create or replace function public.upsert_ingredient_product_drafts(p_rows jsonb)
returns table (inserted int, updated int, skipped_confirmed int)
language plpgsql
as $$
begin
    return query
    with incoming as (
        select distinct on (lower(btrim(x.ingredient_name)))
               lower(btrim(x.ingredient_name)) as ingredient_name, x.product_id, x.ai_note
          from jsonb_to_recordset(p_rows) as x(ingredient_name text, product_id uuid, ai_note text)
         where coalesce(btrim(x.ingredient_name), '') <> ''
    ),
    written as (
        insert into public.ingredient_products (ingredient_name, product_id, ai_note)
        select ingredient_name, product_id, ai_note from incoming
        on conflict (ingredient_name) do update set
            product_id = excluded.product_id,
            ai_note    = excluded.ai_note,
            updated_at = now()
        where public.ingredient_products.status = 'draft'
        returning (xmax = 0) as was_insert
    )
    select
        count(*) filter (where w.was_insert)::int,
        count(*) filter (where not w.was_insert)::int,
        ((select count(*) from incoming) - (select count(*) from written))::int
    from written w;
end;
$$;

-- ---------------------------------------------------------------------------------
-- 5. Read shapes for the two review pages.
-- ---------------------------------------------------------------------------------

-- Every ingredient line with its mapping and product beside it, so the dish review can
-- show an estimated cost per portion without a second round trip per dish. Only
-- orderable dishes: an ingredient left on a dish that later became a price rule must
-- not keep showing up as food.
create or replace view public.dish_ingredient_lines with (security_invoker = on) as
    select
        di.id, di.dish_id, di.ingredient_name, di.portion_qty, di.portion_unit, di.sort_order,
        ip.status        as mapping_status,
        ip.product_id,
        sp.product_number, sp.description as product_description, sp.pack_size,
        sp.pack_count, sp.pack_total_base, sp.base_unit, sp.case_price, sp.price_varies,
        sp.price_as_of
      from public.dish_ingredients di
      join public.orderable_menu_dishes d on d.id = di.dish_id
      left join public.ingredient_products ip on ip.ingredient_name = di.ingredient_name
      left join public.supplier_products sp on sp.id = ip.product_id;

-- One row per distinct ingredient name in use, with how many dishes use it and in which
-- units — the mapping review works down this list, most-used first.
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
        sp.category
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

-- Every ingredient name already in use. The drafting prompt is handed this list so a
-- later batch says "heavy cream" the way an earlier batch did — every synonym that
-- slips through is one more ingredient to map to a product by hand.
create or replace function public.dish_ingredient_names()
returns table (ingredient_name text)
language sql
stable
as $$
    select distinct di.ingredient_name from public.dish_ingredients di order by 1;
$$;

-- Progress per menu for the dish-spec page's picker — grouped in the database rather
-- than pulling 364 dishes to the browser to count them.
create or replace function public.dish_spec_progress()
returns table (menu_source text, season text, total int, unspecced int, drafts int, confirmed int)
language sql
stable
as $$
    select
        d.menu_source, d.season,
        count(*)::int,
        count(*) filter (where d.spec_status = 'none')::int,
        count(*) filter (where d.spec_status = 'draft')::int,
        count(*) filter (where d.spec_status = 'confirmed')::int
      from public.orderable_menu_dishes d
     group by d.menu_source, d.season
     order by d.menu_source, d.season;
$$;

-- ---------------------------------------------------------------------------------
-- RLS: permissive anon, matching menu_dishes and supplier_products (anon key only,
-- gated by the client-side office password). No new auth ceremony (NFR-5).
-- ---------------------------------------------------------------------------------

alter table public.dish_ingredients enable row level security;
drop policy if exists allow_all_dish_ingredients on public.dish_ingredients;
create policy allow_all_dish_ingredients on public.dish_ingredients
    for all using (true) with check (true);

alter table public.ingredient_products enable row level security;
drop policy if exists allow_all_ingredient_products on public.ingredient_products;
create policy allow_all_ingredient_products on public.ingredient_products
    for all using (true) with check (true);
