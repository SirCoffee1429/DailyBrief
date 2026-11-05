-- Station prep sheets (spec/prep-sheets.md): one running list per station, counted against par.
-- Additive only: four new tables and four new functions; nothing existing is changed.
-- RLS is switched on for new public tables automatically (event trigger), so the policies are
-- created here too, in the same pattern as event_tasks (the kitchen side has no login).

-- ─── Stations ────────────────────────────────────────────────────────────────
create table public.prep_stations (
    id          uuid primary key default gen_random_uuid(),
    name        text not null check (btrim(name) <> ''),
    sort_order  integer not null default 0,
    active      boolean not null default true,   -- retired, never deleted: history points here
    created_at  timestamptz not null default now()
);

-- One active station per name; a re-upload finds its station by name.
create unique index prep_stations_active_name on public.prep_stations (lower(name)) where active;

-- ─── Items, with their current count ─────────────────────────────────────────
-- The count lives on the item itself (have / note / changed_*): the sheet shows only "right now",
-- and every change is also appended to prep_entries as history.
create table public.prep_items (
    id          uuid primary key default gen_random_uuid(),
    station_id  uuid not null references public.prep_stations (id),
    section     text,                                   -- null = items before any section (Fry)
    name        text not null check (btrim(name) <> ''),
    par_text    text not null default '',               -- as written on the sheet, for display
    par_qty     numeric check (par_qty > 0),            -- null = no par: no color, no score
    par_unit    text,
    sort_order  integer not null default 0,
    active      boolean not null default true,          -- retired, never deleted
    have        numeric check (have >= 0),              -- null = not counted yet
    note        text,
    changed_at  timestamptz,                            -- last count / done / partial / note
    changed_by  text,                                   -- name as it was when saved
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    check ((par_qty is null) = (par_unit is null))
);

-- One active item per name within a station; an upload keeps an item's count by matching its name.
create unique index prep_items_active_name on public.prep_items (station_id, lower(name)) where active;
create index prep_items_station on public.prep_items (station_id, sort_order) where active;

-- ─── History: every change to an item ────────────────────────────────────────
create table public.prep_entries (
    id             uuid primary key default gen_random_uuid(),
    item_id        uuid not null references public.prep_items (id),
    kind           text not null check (kind in ('count', 'done', 'partial', 'note')),
    amount         numeric,                 -- count: have set to; partial: amount made; done: the par
    have_after     numeric,
    note           text,
    employee_id    uuid references public.employees (id) on delete set null,
    employee_name  text not null,
    created_at     timestamptz not null default now()
);
create index prep_entries_item on public.prep_entries (item_id, created_at desc);

-- ─── Finish count: End of Night / Morning / Night Start ──────────────────────
create table public.prep_counts (
    id             uuid primary key default gen_random_uuid(),
    station_id     uuid not null references public.prep_stations (id),
    label          text not null check (label in ('end_of_night', 'morning', 'night_start')),
    employee_id    uuid references public.employees (id) on delete set null,
    employee_name  text not null,
    created_at     timestamptz not null default now()
);
create index prep_counts_station on public.prep_counts (station_id, created_at desc);

-- ─── Policies (same as event_tasks: the kitchen side is anonymous) ───────────
create policy "Allow all anon operations on prep_stations" on public.prep_stations to anon using (true) with check (true);
create policy "Allow all authenticated operations on prep_stations" on public.prep_stations to authenticated using (true) with check (true);
create policy "Allow all anon operations on prep_items" on public.prep_items to anon using (true) with check (true);
create policy "Allow all authenticated operations on prep_items" on public.prep_items to authenticated using (true) with check (true);
create policy "Allow all anon operations on prep_entries" on public.prep_entries to anon using (true) with check (true);
create policy "Allow all authenticated operations on prep_entries" on public.prep_entries to authenticated using (true) with check (true);
create policy "Allow all anon operations on prep_counts" on public.prep_counts to anon using (true) with check (true);
create policy "Allow all authenticated operations on prep_counts" on public.prep_counts to authenticated using (true) with check (true);

-- ─── Live updates for the station sheet, overview and dashboard tile ─────────
alter publication supabase_realtime add table public.prep_stations, public.prep_items, public.prep_counts;

-- ─── prep_record: one change to one item, saved with its history row ─────────
-- count = set have; done = have to par; partial = add what was made to the CURRENT have
-- (in one transaction, so two cooks tapping at once both count); note = set or clear the note.
-- The name comes from the roster, never from the client.
create or replace function public.prep_record(
    p_item_id uuid, p_kind text, p_amount numeric, p_note text, p_employee_id uuid
) returns public.prep_items
language plpgsql
as $$
declare
    v_item     public.prep_items;
    v_name     text;
    v_have     numeric;
    v_amount   numeric;
    v_note     text;
begin
    select name into v_name from public.employees where id = p_employee_id and active;
    if v_name is null then
        raise exception 'Pick your name first.';
    end if;

    select * into v_item from public.prep_items where id = p_item_id and active for update;
    if not found then
        raise exception 'This item is no longer on the sheet.';
    end if;

    v_have := v_item.have;
    v_note := v_item.note;
    v_amount := p_amount;

    if p_kind = 'count' then
        if p_amount is null or p_amount < 0 then
            raise exception 'Enter how much you have (0 or more).';
        end if;
        v_have := p_amount;
    elsif p_kind = 'done' then
        if v_item.par_qty is null then
            raise exception 'This item has no par, so it cannot be marked done. Enter how much you have.';
        end if;
        v_have := v_item.par_qty;
        v_amount := v_item.par_qty;
    elsif p_kind = 'partial' then
        if p_amount is null or p_amount <= 0 then
            raise exception 'Enter how much you made (more than 0).';
        end if;
        v_have := coalesce(v_item.have, 0) + p_amount;
    elsif p_kind = 'note' then
        v_note := nullif(btrim(coalesce(p_note, '')), '');
        v_amount := null;
    else
        raise exception 'Unknown change: %', p_kind;
    end if;

    update public.prep_items
       set have = v_have, note = v_note, changed_at = now(), changed_by = v_name, updated_at = now()
     where id = p_item_id
     returning * into v_item;

    insert into public.prep_entries (item_id, kind, amount, have_after, note, employee_id, employee_name)
    values (p_item_id, p_kind, v_amount, v_have, case when p_kind = 'note' then v_note end, p_employee_id, v_name);

    return v_item;
end;
$$;

-- ─── prep_finish_count: stamp a station as counted ───────────────────────────
create or replace function public.prep_finish_count(
    p_station_id uuid, p_label text, p_employee_id uuid
) returns public.prep_counts
language plpgsql
as $$
declare
    v_name  text;
    v_row   public.prep_counts;
begin
    select name into v_name from public.employees where id = p_employee_id and active;
    if v_name is null then
        raise exception 'Pick your name first.';
    end if;
    if not exists (select 1 from public.prep_stations where id = p_station_id and active) then
        raise exception 'This station is no longer active.';
    end if;
    if p_label not in ('end_of_night', 'morning', 'night_start') then
        raise exception 'Unknown count: %', p_label;
    end if;

    insert into public.prep_counts (station_id, label, employee_id, employee_name)
    values (p_station_id, p_label, p_employee_id, v_name)
    returning * into v_row;
    return v_row;
end;
$$;

-- ─── prep_upload_rows: an upload's jsonb items as rows (shared by the replace below) ─
create or replace function public.prep_upload_rows(p_items jsonb)
returns table (name text, section text, par_text text, par_qty numeric, par_unit text, sort_order integer)
language sql immutable
as $$
    select btrim(coalesce(e->>'name', '')),
           nullif(btrim(coalesce(e->>'section', '')), ''),
           btrim(coalesce(e->>'par_text', '')),
           (e->>'par_qty')::numeric,
           nullif(btrim(coalesce(e->>'par_unit', '')), ''),
           (ord - 1)::integer
      from jsonb_array_elements(p_items) with ordinality as t(e, ord)
$$;

-- ─── prep_replace_station: an office upload replaces one station's list ──────
-- p_items: [{ "section", "name", "par_text", "par_qty", "par_unit" }] in sheet order.
-- The station is found by name (or created). An item whose name is kept keeps its count and note;
-- if its par's UNIT changed, the old count no longer means anything and is cleared. Items not in the
-- upload are retired (kept for history). One transaction: all or nothing.
create or replace function public.prep_replace_station(p_station_name text, p_items jsonb)
returns table (station_id uuid, inserted integer, updated integer, retired integer)
language plpgsql
as $$
#variable_conflict use_column
declare
    v_station   uuid;
    v_inserted  integer := 0;
    v_updated   integer := 0;
    v_retired   integer := 0;
    v_repeats   text;
begin
    if btrim(coalesce(p_station_name, '')) = '' then
        raise exception 'The station needs a name.';
    end if;
    if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'The upload has no items.';
    end if;

    -- Reject blank or repeated names before touching anything.
    if exists (select 1 from public.prep_upload_rows(p_items) u where u.name = '') then
        raise exception 'Every item needs a name.';
    end if;
    select string_agg(d.n, ', ') into v_repeats
      from (select min(u.name) as n from public.prep_upload_rows(p_items) u
             group by lower(u.name) having count(*) > 1) d;
    if v_repeats is not null then
        raise exception 'Item names repeat in this upload: %', v_repeats;
    end if;

    select s.id into v_station from public.prep_stations s
     where lower(s.name) = lower(btrim(p_station_name)) and s.active;
    if v_station is null then
        insert into public.prep_stations (name, sort_order)
        values (btrim(p_station_name), coalesce((select max(s.sort_order) + 1 from public.prep_stations s), 0))
        returning id into v_station;
    end if;

    -- Retire what the upload no longer lists.
    update public.prep_items i
       set active = false, updated_at = now()
     where i.station_id = v_station and i.active
       and not exists (select 1 from public.prep_upload_rows(p_items) u where lower(u.name) = lower(i.name));
    get diagnostics v_retired = row_count;

    -- Update the items that stay (count and note kept, unless the par's unit changed).
    update public.prep_items i
       set section = u.section, name = u.name, par_text = u.par_text, par_qty = u.par_qty,
           par_unit = u.par_unit, sort_order = u.sort_order, updated_at = now(),
           have = case when i.par_unit is distinct from u.par_unit then null else i.have end
      from public.prep_upload_rows(p_items) u
     where i.station_id = v_station and i.active and lower(i.name) = lower(u.name);
    get diagnostics v_updated = row_count;

    -- Add the new ones.
    insert into public.prep_items (station_id, section, name, par_text, par_qty, par_unit, sort_order)
    select v_station, u.section, u.name, u.par_text, u.par_qty, u.par_unit, u.sort_order
      from public.prep_upload_rows(p_items) u
     where not exists (select 1 from public.prep_items i
                        where i.station_id = v_station and i.active and lower(i.name) = lower(u.name));
    get diagnostics v_inserted = row_count;

    return query select v_station, v_inserted, v_updated, v_retired;
end;
$$;
