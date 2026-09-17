-- Supplier catalog: the purchasable products behind BEO order lists.
--
-- Phase P1 of claudedocs/design_beo_order_guide_2026-09-15.md. Only the two catalog
-- tables are created here; menu_dishes, dish_ingredients, ingredient_products and
-- beo_dish_matches belong to later phases and are not speculated on now.
--
-- The source is N raw Performance Foodservice .xlsx exports uploaded as ONE batch,
-- never the AI-built master list — merging the raw exports reproduces that master
-- exactly (1,381 products / 394 price-varies / 6 unpriced), so the master is
-- disposable and the catalog is rebuildable from source with no AI in the path.

create table if not exists public.supplier_catalog_uploads (
    id              uuid primary key default gen_random_uuid(),
    uploaded_at     timestamptz not null default now(),
    source_label    text,
    file_count      int not null default 0,
    product_count   int not null default 0,
    notes           text
);

create table if not exists public.supplier_products (
    id                  uuid primary key default gen_random_uuid(),

    -- Identity. One product number is one product, across every shelf list it
    -- appears on.
    product_number      text not null unique,
    description         text not null,
    brand               text,
    -- The club's own name for an item; populated on only 5 of 3,008 rows but it is
    -- the kitchen's vocabulary, so it is kept.
    custom_description  text,

    pack_size           text not null,

    -- Parsed from pack_size at ingest. "14/4 LB" -> 14 packs x 4 LB = 56 lb.
    pack_count          numeric,
    pack_unit_size      numeric,
    -- Ranges ("8/6-7 LB") keep both ends. pack_total_base uses the LOW end so an
    -- order never under-buys.
    pack_unit_size_max  numeric,
    pack_unit           text,
    pack_total_base     numeric,
    -- One of 'lb', 'gal', 'ct' — the base of the unit's class. Weight, volume and
    -- count never convert into each other; a cross-class request is a gap, never a
    -- guess, because that would need a per-ingredient density this system lacks.
    base_unit           text,

    uom                 text,

    price               numeric,
    -- Parsed from the price string's own suffix, never inferred: "$54.46" is
    -- 'case', "$6.1199/lb" is 'lb'.
    price_basis         text,

    -- Derived ONCE at ingest rather than branched on at every read. 219 products are
    -- catch-weight; a read-time branch means some future call site forgets the rule
    -- and prints a line ~50x too cheap. NULL where the basis and the pack unit are
    -- different classes (3 products priced per lb but packed by count) — an honest
    -- gap instead of a wrong number.
    case_price          numeric,

    -- True when the same product came in at two different prices within one batch.
    price_varies        boolean not null default false,
    price_as_of         date,
    source_lists        text[] not null default '{}',

    -- Sticky: set once, never recomputed by a refresh, so re-uploading a batch
    -- cannot churn a categorisation someone curated. Nothing in P1 populates these.
    category            text,
    item_group          text,

    first_seen_at       timestamptz not null default now(),
    last_seen_at        timestamptz not null default now(),
    -- A product missing from a later batch was absent from that export, NOT
    -- discontinued. Nothing is ever deleted; last_seen_at carries the truth.
    is_active           boolean not null default true
);

-- Search is by name/brand/number over ~1,400 rows.
create index if not exists supplier_products_description_idx
    on public.supplier_products using gin (to_tsvector('english', description));
create index if not exists supplier_products_product_number_idx
    on public.supplier_products (product_number);
create index if not exists supplier_products_category_idx
    on public.supplier_products (category);

-- RLS: permissive anon, matching every other table in this app (anon key only,
-- gated by the client-side office password). No new auth ceremony — the same
-- posture, stated rather than silently assumed.
alter table public.supplier_products enable row level security;
alter table public.supplier_catalog_uploads enable row level security;

drop policy if exists allow_all_supplier_products on public.supplier_products;
create policy allow_all_supplier_products
    on public.supplier_products
    for all
    using (true)
    with check (true);

drop policy if exists allow_all_supplier_catalog_uploads on public.supplier_catalog_uploads;
create policy allow_all_supplier_catalog_uploads
    on public.supplier_catalog_uploads
    for all
    using (true)
    with check (true);
