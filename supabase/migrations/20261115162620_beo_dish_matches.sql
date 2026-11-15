-- Order guide step B (spec/beo-order-from-specs.md): the BEO order list built from confirmed dishes.
-- Additive only: one new table, two new columns on event_order_items. Nothing existing is changed.
-- RLS is switched on for new public tables automatically (event trigger), so the policies are
-- created here too, in the same pattern as prep_counts (the office side has no login).

-- ─── Answers for BEO lines, saved once per wording ───────────────────────────
-- One row per BEO line wording (normalised: lowercase, spaces collapsed, trimmed), reused on every
-- future BEO with the same wording. under_dish_id is set only for a dish name typed under another
-- dish ("Caesar Salad" under Build Your Pasta Bar): that answer holds for that pair only.
create table public.beo_dish_matches (
    id             uuid primary key default gen_random_uuid(),
    source_text    text not null check (btrim(source_text) <> ''),
    under_dish_id  uuid references public.menu_dishes (id) on delete cascade,
    kind           text not null check (kind in ('dish', 'not_food', 'not_on_menu', 'describes_above', 'part_of_dish')),
    dish_id        uuid references public.menu_dishes (id) on delete cascade,
    confirmed_at   timestamptz not null default now(),
    -- One answer per wording (and per pair). nulls not distinct: one standalone answer, as on menu_dishes.
    unique nulls not distinct (source_text, under_dish_id),
    -- A dish answer names its dish; no other answer does.
    check ((kind = 'dish') = (dish_id is not null)),
    -- "Part of" needs the dish it is part of.
    check (kind <> 'part_of_dish' or under_dish_id is not null),
    -- Under a dish the only answers are "Part of" and "Its own dish".
    check (under_dish_id is null or kind in ('dish', 'part_of_dish'))
);
-- If a menu is re-ingested and a dish disappears, its answers go with it (on delete cascade) and the
-- line is asked again, never pointed at nothing.

create policy "Allow all anon operations on beo_dish_matches" on public.beo_dish_matches to anon using (true) with check (true);
create policy "Allow all authenticated operations on beo_dish_matches" on public.beo_dish_matches to authenticated using (true) with check (true);

-- ─── Order list rows: AI label and the BEO's own lines ───────────────────────
-- ai_guess defaults to TRUE: every existing row, and every row the live site's Generate writes before
-- this code ships, came from the AI. Only rows built from a confirmed spec set it false.
-- beo_text: the BEO lines a spec-built group came from, shown in grey under its heading.
alter table public.event_order_items
    add column ai_guess boolean not null default true,
    add column beo_text text;

-- To undo (nothing else depends on these yet):
--   drop table public.beo_dish_matches;
--   alter table public.event_order_items drop column ai_guess, drop column beo_text;
