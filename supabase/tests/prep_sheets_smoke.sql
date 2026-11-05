-- Smoke test for 20261105174946_prep_sheets.sql. Run as ONE script:  begin; <migration>; <this file>
-- before applying, or  begin; <this file>  after. It ALWAYS ends in an exception, so nothing it does
-- is ever kept: a failed check raises its own message, and a clean run raises 'SMOKE_OK ...'.
-- Afterwards, confirm by SELECT that no 'ZZ Test' station (or, before applying, no prep_ table) exists.

do $$
declare
    v_emp      uuid := (select id from public.employees where active order by name limit 1);
    v_res      record;
    v_station  uuid;
    v_salmon   uuid;
    v_nopar    uuid;
    v_item     public.prep_items;
    v_failed   boolean;
begin
    assert v_emp is not null, 'needs one active employee';

    -- 1. First upload creates the station and three items.
    select * into v_res from public.prep_replace_station('ZZ Test', '[
        {"section":"Protein","name":"Salmon","par_text":"20 ea","par_qty":20,"par_unit":"ea"},
        {"section":"Protein","name":"Broccoli","par_text":"(2) 1/3 pans","par_qty":2,"par_unit":"1/3 pan"},
        {"section":"Sauces","name":"No Par","par_text":"","par_qty":null,"par_unit":null}]'::jsonb);
    assert (v_res.inserted, v_res.updated, v_res.retired) = (3, 0, 0), format('first upload: %s', v_res);
    v_station := v_res.station_id;
    select id into v_salmon from public.prep_items where station_id = v_station and name = 'Salmon';
    select id into v_nopar from public.prep_items where station_id = v_station and name = 'No Par';

    -- 2. Count 4 → partial +5 → done → note → clear note.
    v_item := public.prep_record(v_salmon, 'count', 4, null, v_emp);
    assert v_item.have = 4, 'count 4';
    v_item := public.prep_record(v_salmon, 'partial', 5, null, v_emp);
    assert v_item.have = 9, 'partial adds to current: 4 + 5 = 9';
    v_item := public.prep_record(v_salmon, 'done', null, null, v_emp);
    assert v_item.have = 20, 'done sets par';
    v_item := public.prep_record(v_salmon, 'note', null, '  only 12 in walk-in ', v_emp);
    assert v_item.note = 'only 12 in walk-in' and v_item.have = 20, 'note trimmed, have kept';
    assert v_item.changed_by = (select name from public.employees where id = v_emp), 'name from roster';
    v_item := public.prep_record(v_salmon, 'note', null, '   ', v_emp);
    assert v_item.note is null, 'blank note clears';
    assert (select count(*) from public.prep_entries where item_id = v_salmon) = 5, 'five history rows';

    -- 3. Partial on an uncounted item starts from 0; a no-par item can be counted.
    v_item := public.prep_record(v_nopar, 'count', 3, null, v_emp);
    assert v_item.have = 3, 'no-par item counts';

    -- 4. Finish count.
    assert (public.prep_finish_count(v_station, 'end_of_night', v_emp)).label = 'end_of_night', 'finish count';

    -- 5. Same upload again keeps every count.
    select * into v_res from public.prep_replace_station('zz test', '[
        {"section":"Protein","name":"Salmon","par_text":"20 ea","par_qty":20,"par_unit":"ea"},
        {"section":"Protein","name":"Broccoli","par_text":"(2) 1/3 pans","par_qty":2,"par_unit":"1/3 pan"},
        {"section":"Sauces","name":"No Par","par_text":"","par_qty":null,"par_unit":null}]'::jsonb);
    assert (v_res.station_id, v_res.inserted, v_res.updated, v_res.retired) = (v_station, 0, 3, 0), format('re-upload: %s', v_res);
    assert (select have from public.prep_items where id = v_salmon) = 20, 'count kept on re-upload';

    -- 6. Unit change clears the count; a dropped item is retired, not deleted; a new one is added.
    select * into v_res from public.prep_replace_station('ZZ Test', '[
        {"section":"Protein","name":"salmon","par_text":"2 bags","par_qty":2,"par_unit":"bag"},
        {"section":"Protein","name":"Broccoli","par_text":"(2) 1/3 pans","par_qty":2,"par_unit":"1/3 pan"},
        {"section":null,"name":"Lemons","par_text":"10 ea","par_qty":10,"par_unit":"ea"}]'::jsonb);
    assert (v_res.inserted, v_res.updated, v_res.retired) = (1, 2, 1), format('changed upload: %s', v_res);
    select * into v_item from public.prep_items where id = v_salmon;
    assert v_item.have is null and v_item.par_unit = 'bag' and v_item.name = 'salmon', 'unit change clears have';
    assert (select active from public.prep_items where id = v_nopar) = false, 'dropped item retired';
    assert exists (select 1 from public.prep_entries where item_id = v_nopar), 'retired item keeps history';

    -- 7. Refusals.
    v_failed := false; begin perform public.prep_record(v_salmon, 'count', -1, null, v_emp); exception when others then v_failed := true; end;
    assert v_failed, 'negative count refused';
    v_failed := false; begin perform public.prep_record(v_nopar, 'count', 1, null, v_emp); exception when others then v_failed := true; end;
    assert v_failed, 'retired item refused';
    v_failed := false; begin perform public.prep_record(v_salmon, 'count', 1, null, gen_random_uuid()); exception when others then v_failed := true; end;
    assert v_failed, 'unknown employee refused';
    v_failed := false; begin perform public.prep_record(v_salmon, 'partial', 0, null, v_emp); exception when others then v_failed := true; end;
    assert v_failed, 'partial of 0 refused';
    v_failed := false; begin perform public.prep_record(v_salmon, 'bogus', 1, null, v_emp); exception when others then v_failed := true; end;
    assert v_failed, 'unknown kind refused';
    v_failed := false; begin perform public.prep_finish_count(v_station, 'lunch', v_emp); exception when others then v_failed := true; end;
    assert v_failed, 'unknown count label refused';
    v_failed := false;
    begin perform public.prep_replace_station('ZZ Test', '[{"name":"A"},{"name":"a"}]'::jsonb); exception when others then v_failed := true; end;
    assert v_failed, 'repeated names refused';
    v_failed := false; begin perform public.prep_replace_station('ZZ Test', '[]'::jsonb); exception when others then v_failed := true; end;
    assert v_failed, 'empty upload refused';
    assert (select count(*) from public.prep_items where station_id = v_station and active) = 3, 'refused uploads changed nothing';

    -- 8. Done on an item without a par is refused.
    insert into public.prep_items (station_id, name) values (v_station, 'Bare') returning * into v_item;
    v_failed := false; begin perform public.prep_record(v_item.id, 'done', null, null, v_emp); exception when others then v_failed := true; end;
    assert v_failed, 'done without par refused';

    -- 9. Wiring: RLS on, 8 policies, 3 tables in the realtime publication.
    assert (select bool_and(relrowsecurity) from pg_class
             where oid in ('public.prep_stations'::regclass, 'public.prep_items'::regclass,
                           'public.prep_entries'::regclass, 'public.prep_counts'::regclass)), 'RLS on';
    assert (select count(*) from pg_policies where schemaname = 'public' and tablename like 'prep\_%') = 8, '8 policies';
    assert (select count(*) from pg_publication_tables where pubname = 'supabase_realtime'
             and tablename in ('prep_stations', 'prep_items', 'prep_counts')) = 3, 'realtime publication';

    -- Success is reported as an exception on purpose, so the whole run is rolled back.
    raise exception 'SMOKE_OK: all prep_sheets checks passed';
end;
$$;
