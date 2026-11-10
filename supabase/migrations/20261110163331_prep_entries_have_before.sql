-- Prep history records each item's count BEFORE a change too (spec/prep-sheets.md, Addition 2026-11-10), so the
-- Completed tab can tell how much was made: Done stores the par, a typed count stores only the new value.
-- Additive only: one nullable column, and prep_record replaced with the same signature, return type and grants.
-- Older rows keep have_before null (the test history is deleted before go-live anyway, so there is no backfill).

alter table public.prep_entries add column have_before numeric;   -- the item's count just before this change; null = not counted yet

-- prep_record exactly as in 20261105174946_prep_sheets.sql, plus v_before saved into have_before.
create or replace function public.prep_record(
    p_item_id uuid, p_kind text, p_amount numeric, p_note text, p_employee_id uuid
) returns public.prep_items
language plpgsql
as $$
declare
    v_item     public.prep_items;
    v_name     text;
    v_have     numeric;
    v_before   numeric;
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
    v_before := v_item.have;
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

    insert into public.prep_entries (item_id, kind, amount, have_before, have_after, note, employee_id, employee_name)
    values (p_item_id, p_kind, v_amount, v_before, v_have, case when p_kind = 'note' then v_note end, p_employee_id, v_name);

    return v_item;
end;
$$;
