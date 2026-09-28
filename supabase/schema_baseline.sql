-- =========================================================================================
-- SCHEMA BASELINE — the live production database's structure, dumped 2026-09-28.
-- Project chajwmoohmiugdgvqjyo (DailyBrief). Structure only: no rows, no secrets.
--
-- WHY: the repo's migration files cannot rebuild production (only 3 of 54 applied
-- migrations match a file; several base tables predate migration tracking). This file is
-- the complete, readable definition of what production looks like — for disaster recovery,
-- a test copy, or the Universal DailyBrief starting point.
--
-- THIS IS NOT A MIGRATION. Never run it against production, and never `supabase db push`
-- or `db reset` there. Verified at dump time: 32 tables, 3 views, 12 functions, 52 RLS
-- policies, 0 table triggers — equal to live.
--
-- REGENERATE (Docker Desktop running, CLI logged in):
--   supabase db dump --linked -f supabase/schema_baseline.sql
--   (then re-add this header)
--
-- NOT IN THE DUMP — database-wide objects a schema dump skips. Recreate by hand:
--   CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
--     WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
--     EXECUTE FUNCTION public.rls_auto_enable();
--   (turns RLS on for every new public table; the function itself IS below)
-- =========================================================================================
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."dish_ingredient_names"() RETURNS TABLE("ingredient_name" "text")
    LANGUAGE "sql" STABLE
    AS $$
    select distinct di.ingredient_name from public.dish_ingredients di order by 1;
$$;


ALTER FUNCTION "public"."dish_ingredient_names"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dish_spec_progress"() RETURNS TABLE("menu_source" "text", "season" "text", "total" integer, "unspecced" integer, "drafts" integer, "confirmed" integer)
    LANGUAGE "sql" STABLE
    AS $$
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


ALTER FUNCTION "public"."dish_spec_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_dates"() RETURNS TABLE("report_date" "date")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT DISTINCT sd.report_date
  FROM sales_data sd
  ORDER BY sd.report_date DESC;
$$;


ALTER FUNCTION "public"."get_sales_dates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer DEFAULT 15) RETURNS TABLE("content" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT content, 1 - (embedding <=> query_embedding) AS similarity
  FROM workbook_chunks
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."menu_dish_sources"() RETURNS TABLE("menu_source" "text", "season" "text", "total" integer, "drafts" integer, "confirmed" integer)
    LANGUAGE "sql" STABLE
    AS $$
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


ALTER FUNCTION "public"."menu_dish_sources"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_dish_spec"("p_dish_id" "uuid", "p_basis" "text", "p_note" "text", "p_ingredients" "jsonb", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."save_dish_spec"("p_dish_id" "uuid", "p_basis" "text", "p_note" "text", "p_ingredients" "jsonb", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_dish_spec_drafts"("p_specs" "jsonb") RETURNS TABLE("written" integer, "skipped_confirmed" integer, "skipped_not_orderable" integer)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."save_dish_spec_drafts"("p_specs" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_supplier_categories"("rows" "jsonb") RETURNS TABLE("seeded" integer, "skipped" integer, "unmatched" integer)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."seed_supplier_categories"("rows" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."supplier_categories"() RETURNS TABLE("category" "text", "product_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
    select category, count(*)
      from public.supplier_products
     where category is not null
     group by category
     order by category;
$$;


ALTER FUNCTION "public"."supplier_categories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_ingredient_product_drafts"("p_rows" "jsonb") RETURNS TABLE("inserted" integer, "updated" integer, "skipped_confirmed" integer)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."upsert_ingredient_product_drafts"("p_rows" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_menu_dish_drafts"("p_dishes" "jsonb") RETURNS TABLE("inserted" integer, "updated" integer, "skipped_confirmed" integer)
    LANGUAGE "plpgsql"
    AS $$
begin
    return query
    with incoming as (
        select
            trim(x.name)                                   as name,
            trim(x.menu_source)                            as menu_source,
            nullif(trim(coalesce(x.menu_section, '')), '') as menu_section,
            nullif(trim(coalesce(x.description, '')), '')  as description,
            x.source_page, x.upcharge, x.base_price, x.price_unit,
            coalesce(x.price_qty, 1)                       as price_qty,
            x.serves, x.min_order,
            nullif(trim(coalesce(x.season, '')), '')       as season
        from jsonb_to_recordset(p_dishes) as x(
            name text, menu_source text, menu_section text, description text,
            source_page int, upcharge numeric, base_price numeric, price_unit text,
            price_qty numeric, serves int, min_order int, season text
        )
        where coalesce(trim(x.name), '') <> ''
          and coalesce(trim(x.menu_source), '') <> ''
    ),
    deduped as (
        select distinct on (name, menu_source, menu_section, season) *
        from incoming
        order by name, menu_source, menu_section, season, source_page
    ),
    written as (
        insert into public.menu_dishes (
            name, menu_source, menu_section, description, source_page,
            upcharge, base_price, price_unit, price_qty, serves, min_order, season
        )
        select
            name, menu_source, menu_section, description, source_page,
            upcharge, base_price, price_unit, price_qty, serves, min_order, season
        from deduped
        on conflict on constraint menu_dishes_identity do update set
            description  = excluded.description,
            source_page  = excluded.source_page,
            upcharge     = excluded.upcharge,
            base_price   = excluded.base_price,
            price_unit   = excluded.price_unit,
            price_qty    = excluded.price_qty,
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


ALTER FUNCTION "public"."upsert_menu_dish_drafts"("p_dishes" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."banquet_event_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" "text",
    "guest_count" integer,
    "food_items" "jsonb" DEFAULT '[]'::"jsonb",
    "raw_text" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "completed" boolean DEFAULT false,
    "location" "text",
    "event_end_date" "date",
    "timeline" "jsonb" DEFAULT '[]'::"jsonb",
    "sections" "jsonb" DEFAULT '[]'::"jsonb",
    "notes_text" "text",
    "crew_notes" "text",
    "order_submitted" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."banquet_event_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."briefing_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "briefing_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."briefing_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."briefings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "department" "text" DEFAULT 'kitchen'::"text" NOT NULL,
    "destination" "text" DEFAULT 'boh'::"text" NOT NULL,
    "author" "text",
    CONSTRAINT "briefings_destination_check" CHECK (("destination" = ANY (ARRAY['boh'::"text", 'foh'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."briefings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."briefings"."author" IS 'Self-declared manager display name from lib/identity.js (localStorage). NULL for rows predating attribution.';



CREATE TABLE IF NOT EXISTS "public"."coverage_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "week_start" "date" NOT NULL,
    "day_of_week" integer,
    "exception_type" "text" NOT NULL,
    "shift_type" "text",
    "station" "text",
    "headcount_delta" integer,
    "note" "text",
    "active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "coverage_exceptions_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."coverage_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coverage_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "group_label" "text" NOT NULL,
    "role_label" "text" NOT NULL,
    "shift_type" "text" NOT NULL,
    "station" "text",
    "days_of_week" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "headcount" integer DEFAULT 1 NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "seasonal" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "coverage_slots_headcount_check" CHECK (("headcount" >= 0))
);


ALTER TABLE "public"."coverage_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dish_ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dish_id" "uuid" NOT NULL,
    "ingredient_name" "text" NOT NULL,
    "portion_qty" numeric NOT NULL,
    "portion_unit" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dish_ingredients_ingredient_name_check" CHECK ((("ingredient_name" <> ''::"text") AND ("ingredient_name" = "lower"("btrim"("ingredient_name"))))),
    CONSTRAINT "dish_ingredients_portion_qty_check" CHECK (("portion_qty" > (0)::numeric)),
    CONSTRAINT "dish_ingredients_portion_unit_check" CHECK (("portion_unit" = ANY (ARRAY['oz'::"text", 'lb'::"text", 'floz'::"text", 'each'::"text"])))
);


ALTER TABLE "public"."dish_ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredient_products" (
    "ingredient_name" "text" NOT NULL,
    "product_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "ai_note" "text",
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ingredient_products_ingredient_name_check" CHECK ((("ingredient_name" <> ''::"text") AND ("ingredient_name" = "lower"("btrim"("ingredient_name"))))),
    CONSTRAINT "ingredient_products_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'confirmed'::"text"])))
);


ALTER TABLE "public"."ingredient_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_dishes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "menu_source" "text" NOT NULL,
    "menu_section" "text",
    "description" "text",
    "source_page" integer,
    "upcharge" numeric,
    "base_price" numeric,
    "price_unit" "text",
    "serves" integer,
    "min_order" integer,
    "season" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_price_rule" boolean DEFAULT false NOT NULL,
    "price_qty" numeric DEFAULT 1 NOT NULL,
    "spec_basis" "text",
    "spec_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "spec_note" "text",
    "spec_confirmed_at" timestamp with time zone,
    CONSTRAINT "menu_dishes_price_unit_check" CHECK (("price_unit" = ANY (ARRAY['each'::"text", 'person'::"text", 'dozen'::"text", 'tray'::"text", 'piece'::"text", 'lb'::"text"]))),
    CONSTRAINT "menu_dishes_season_check" CHECK (("season" = ANY (ARRAY['spring'::"text", 'summer'::"text", 'fall'::"text", 'winter'::"text"]))),
    CONSTRAINT "menu_dishes_spec_basis_check" CHECK (("spec_basis" = ANY (ARRAY['person'::"text", 'each'::"text", 'piece'::"text", 'dozen'::"text", 'tray'::"text", 'lb'::"text"]))),
    CONSTRAINT "menu_dishes_spec_status_check" CHECK (("spec_status" = ANY (ARRAY['none'::"text", 'draft'::"text", 'confirmed'::"text"]))),
    CONSTRAINT "menu_dishes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'confirmed'::"text"])))
);


ALTER TABLE "public"."menu_dishes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."menu_dishes"."is_price_rule" IS 'True when the row states a pricing rule (a selection surcharge) rather than a dish. Never give these ingredients and never order food for them: the dish the rule applies to is a separate row that is ordered on its own.';



COMMENT ON COLUMN "public"."menu_dishes"."price_qty" IS 'How many price_unit the base_price buys. "$85 for 20 pieces" is base_price 85, price_qty 20, price_unit piece. Defaults to 1, the ordinary case.';



CREATE OR REPLACE VIEW "public"."orderable_menu_dishes" WITH ("security_invoker"='on') AS
 SELECT "id",
    "name",
    "menu_source",
    "menu_section",
    "description",
    "source_page",
    "upcharge",
    "base_price",
    "price_unit",
    "serves",
    "min_order",
    "season",
    "status",
    "confirmed_at",
    "created_at",
    "updated_at",
    "is_price_rule",
    "price_qty",
    "spec_basis",
    "spec_status",
    "spec_note",
    "spec_confirmed_at"
   FROM "public"."menu_dishes"
  WHERE (("status" = 'confirmed'::"text") AND ("is_price_rule" = false));


ALTER VIEW "public"."orderable_menu_dishes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_number" "text" NOT NULL,
    "description" "text" NOT NULL,
    "brand" "text",
    "custom_description" "text",
    "pack_size" "text" NOT NULL,
    "pack_count" numeric,
    "pack_unit_size" numeric,
    "pack_unit_size_max" numeric,
    "pack_unit" "text",
    "pack_total_base" numeric,
    "base_unit" "text",
    "uom" "text",
    "price" numeric,
    "price_basis" "text",
    "case_price" numeric,
    "price_varies" boolean DEFAULT false NOT NULL,
    "price_as_of" "date",
    "source_lists" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "category" "text",
    "item_group" "text",
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."supplier_products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dish_ingredient_lines" WITH ("security_invoker"='on') AS
 SELECT "di"."id",
    "di"."dish_id",
    "di"."ingredient_name",
    "di"."portion_qty",
    "di"."portion_unit",
    "di"."sort_order",
    "ip"."status" AS "mapping_status",
    "ip"."product_id",
    "sp"."product_number",
    "sp"."description" AS "product_description",
    "sp"."pack_size",
    "sp"."pack_count",
    "sp"."pack_total_base",
    "sp"."base_unit",
    "sp"."case_price",
    "sp"."price_varies",
    "sp"."price_as_of"
   FROM ((("public"."dish_ingredients" "di"
     JOIN "public"."orderable_menu_dishes" "d" ON (("d"."id" = "di"."dish_id")))
     LEFT JOIN "public"."ingredient_products" "ip" ON (("ip"."ingredient_name" = "di"."ingredient_name")))
     LEFT JOIN "public"."supplier_products" "sp" ON (("sp"."id" = "ip"."product_id")));


ALTER VIEW "public"."dish_ingredient_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "week_start" "date",
    "day_of_week" integer NOT NULL,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "note" "text",
    CONSTRAINT "employee_availability_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."employee_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "eligible_shift_types" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "trained_stations" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "primary_station" "text",
    "max_weekly_hours" numeric DEFAULT 40 NOT NULL,
    "target_weekly_hours" numeric,
    "typical_days_per_week" integer,
    "availability_notes" "text",
    "notes" "text",
    "availability_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "station_ratings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "employees_max_weekly_hours_check" CHECK (("max_weekly_hours" > (0)::numeric)),
    CONSTRAINT "employees_typical_days_per_week_check" CHECK ((("typical_days_per_week" >= 1) AND ("typical_days_per_week" <= 7)))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "beo_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "source_dish" "text",
    "is_ordered" boolean DEFAULT false NOT NULL,
    "is_manual" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note" "text"
);


ALTER TABLE "public"."event_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "beo_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_size" integer,
    "workbook_id" "uuid"
);


ALTER TABLE "public"."event_recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "beo_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid",
    "is_generated" boolean DEFAULT false NOT NULL,
    "in_progress" boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY "public"."event_tasks" REPLICA IDENTITY FULL;


ALTER TABLE "public"."event_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."generation_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "week_start" "date" NOT NULL,
    "params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "unfilled" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "validator_report" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "duration_ms" integer,
    "schedule_id" "uuid",
    "ai_review" "jsonb",
    "shift_count" integer,
    "status" "text" DEFAULT 'complete'::"text" NOT NULL,
    "iterations" integer DEFAULT 0 NOT NULL,
    "error" "text",
    "findings" "jsonb"
);

ALTER TABLE ONLY "public"."generation_runs" REPLICA IDENTITY FULL;


ALTER TABLE "public"."generation_runs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ingredient_usage" WITH ("security_invoker"='on') AS
 SELECT "u"."ingredient_name",
    "u"."dish_count",
    "u"."units",
    "ip"."status" AS "mapping_status",
    "ip"."product_id",
    "ip"."ai_note",
    "sp"."product_number",
    "sp"."description" AS "product_description",
    "sp"."brand",
    "sp"."pack_size",
    "sp"."pack_count",
    "sp"."pack_total_base",
    "sp"."base_unit",
    "sp"."case_price",
    "sp"."price_varies",
    "sp"."category"
   FROM ((( SELECT "di"."ingredient_name",
            ("count"(DISTINCT "di"."dish_id"))::integer AS "dish_count",
            "array_agg"(DISTINCT "di"."portion_unit" ORDER BY "di"."portion_unit") AS "units"
           FROM ("public"."dish_ingredients" "di"
             JOIN "public"."orderable_menu_dishes" "d" ON (("d"."id" = "di"."dish_id")))
          GROUP BY "di"."ingredient_name") "u"
     LEFT JOIN "public"."ingredient_products" "ip" ON (("ip"."ingredient_name" = "u"."ingredient_name")))
     LEFT JOIN "public"."supplier_products" "sp" ON (("sp"."id" = "ip"."product_id")));


ALTER VIEW "public"."ingredient_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."management_note_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note_id" "uuid" NOT NULL,
    "device_id" "text" NOT NULL,
    "author_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."management_note_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."management_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "author" "text" DEFAULT 'Manager'::"text" NOT NULL,
    "pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'general'::"text" NOT NULL
);


ALTER TABLE "public"."management_notes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."management_notes"."category" IS 'Whiteboard column: alerts, events, comms, features';



CREATE TABLE IF NOT EXISTS "public"."office_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kind" "text" NOT NULL,
    "actor_name" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "link" "text" NOT NULL,
    CONSTRAINT "office_notifications_kind_check" CHECK (("kind" = ANY (ARRAY['time_off_created'::"text", 'time_off_cancelled'::"text", 'availability_changed'::"text", 'beo_email_received'::"text", 'beo_email_failed'::"text"])))
);


ALTER TABLE "public"."office_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_beo_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "postmark_message_id" "text" NOT NULL,
    "from_email" "text" NOT NULL,
    "subject" "text",
    "pdf_path" "text",
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "parsed_events" "jsonb",
    "error_text" "text",
    "resolved_at" timestamp with time zone,
    "excluded_events" "jsonb",
    CONSTRAINT "pending_beo_imports_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'pending'::"text", 'parse_failed'::"text", 'approved'::"text", 'discarded'::"text"])))
);


ALTER TABLE "public"."pending_beo_imports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pending_beo_imports"."excluded_events" IS 'Event names filtered out by EXCLUDED_EVENT_NAMES in receive-beo-email, kept so a wrongly-excluded BEO is still discoverable. Null or [] means nothing was dropped.';



CREATE TABLE IF NOT EXISTS "public"."recipe_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."recipe_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "report_date" "date" NOT NULL,
    "item_name" "text" NOT NULL,
    "units_sold" numeric NOT NULL,
    "category" "text",
    "metadata" "jsonb",
    "unit_price" numeric DEFAULT 0,
    "total_net_sales" numeric DEFAULT 0,
    "discounts" numeric DEFAULT 0,
    "net_sales" numeric DEFAULT 0,
    "tax" numeric DEFAULT 0
);


ALTER TABLE "public"."sales_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_pins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "station" "text" NOT NULL,
    "shift_type" "text" NOT NULL,
    "days_of_week" integer[] NOT NULL,
    "week_start" "date",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "note" "text",
    "start_time" time without time zone,
    "end_time" time without time zone,
    CONSTRAINT "schedule_pins_days_of_week_check" CHECK (("array_length"("days_of_week", 1) >= 1))
);


ALTER TABLE "public"."schedule_pins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_quotas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "station" "text" NOT NULL,
    "shift_type" "text",
    "count" integer NOT NULL,
    "mode" "text" DEFAULT 'exact'::"text" NOT NULL,
    "week_start" "date",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "note" "text",
    "start_time" time without time zone,
    "end_time" time without time zone,
    CONSTRAINT "schedule_quotas_count_check" CHECK ((("count" >= 1) AND ("count" <= 7))),
    CONSTRAINT "schedule_quotas_mode_check" CHECK (("mode" = ANY (ARRAY['exact'::"text", 'at_most'::"text", 'at_least'::"text"])))
);


ALTER TABLE "public"."schedule_quotas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "week_start" "date" NOT NULL,
    "schedule_data" "jsonb" NOT NULL,
    "file_name" "text",
    "file_url" "text",
    "raw_text" "text",
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "draft_data" "jsonb",
    CONSTRAINT "schedules_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduling_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rule_text" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "week_start" "date",
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."scheduling_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_catalog_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_label" "text",
    "file_count" integer DEFAULT 0 NOT NULL,
    "product_count" integer DEFAULT 0 NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."supplier_catalog_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_off_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "employee_name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "time_type" "text" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "time_off_requests_custom_times" CHECK (((("time_type" = 'custom'::"text") AND ("start_time" IS NOT NULL) AND ("end_time" IS NOT NULL)) OR ("time_type" <> 'custom'::"text"))),
    CONSTRAINT "time_off_requests_date_order" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "time_off_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'denied'::"text"]))),
    CONSTRAINT "time_off_requests_time_type_check" CHECK (("time_type" = ANY (ARRAY['full'::"text", 'am'::"text", 'pm'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."time_off_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."upcoming_banquets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_date" "date" NOT NULL,
    "event_name" "text" NOT NULL,
    "start_time" "text",
    "location" "text",
    "guest_count" integer DEFAULT 0,
    "event_type" "text",
    "source" "text",
    "raw_pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."upcoming_banquets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "week_start" "date" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "meal" "text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weekly_features_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "weekly_features_meal_check" CHECK (("meal" = ANY (ARRAY['lunch'::"text", 'dinner'::"text"])))
);


ALTER TABLE "public"."weekly_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workbook_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workbook_id" "uuid" NOT NULL,
    "sheet_name" "text",
    "content" "text" NOT NULL,
    "row_start" integer,
    "row_end" integer,
    "embedding" "public"."vector"(768)
);


ALTER TABLE "public"."workbook_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workbook_sheets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workbook_id" "uuid" NOT NULL,
    "sheet_name" "text" NOT NULL,
    "sheet_index" integer DEFAULT 0 NOT NULL,
    "headers" "jsonb",
    "rows" "jsonb"
);


ALTER TABLE "public"."workbook_sheets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workbooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text",
    "file_size" integer,
    "sheet_count" integer DEFAULT 0,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "category" "text" DEFAULT 'Uncategorized'::"text",
    CONSTRAINT "workbooks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'parsing'::"text", 'parsed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."workbooks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."banquet_event_orders"
    ADD CONSTRAINT "banquet_event_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."briefing_tasks"
    ADD CONSTRAINT "briefing_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."briefings"
    ADD CONSTRAINT "briefings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coverage_exceptions"
    ADD CONSTRAINT "coverage_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coverage_slots"
    ADD CONSTRAINT "coverage_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dish_ingredients"
    ADD CONSTRAINT "dish_ingredients_one_per_dish" UNIQUE ("dish_id", "ingredient_name");



ALTER TABLE ONLY "public"."dish_ingredients"
    ADD CONSTRAINT "dish_ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_order_items"
    ADD CONSTRAINT "event_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_recipes"
    ADD CONSTRAINT "event_recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_tasks"
    ADD CONSTRAINT "event_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generation_runs"
    ADD CONSTRAINT "generation_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredient_products"
    ADD CONSTRAINT "ingredient_products_pkey" PRIMARY KEY ("ingredient_name");



ALTER TABLE ONLY "public"."management_note_likes"
    ADD CONSTRAINT "management_note_likes_note_id_device_id_key" UNIQUE ("note_id", "device_id");



ALTER TABLE ONLY "public"."management_note_likes"
    ADD CONSTRAINT "management_note_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."management_notes"
    ADD CONSTRAINT "management_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_dishes"
    ADD CONSTRAINT "menu_dishes_identity" UNIQUE NULLS NOT DISTINCT ("name", "menu_source", "menu_section", "season");



ALTER TABLE ONLY "public"."menu_dishes"
    ADD CONSTRAINT "menu_dishes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."office_notifications"
    ADD CONSTRAINT "office_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_beo_imports"
    ADD CONSTRAINT "pending_beo_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_beo_imports"
    ADD CONSTRAINT "pending_beo_imports_postmark_message_id_key" UNIQUE ("postmark_message_id");



ALTER TABLE ONLY "public"."recipe_categories"
    ADD CONSTRAINT "recipe_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."recipe_categories"
    ADD CONSTRAINT "recipe_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_data"
    ADD CONSTRAINT "sales_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_pins"
    ADD CONSTRAINT "schedule_pins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_quotas"
    ADD CONSTRAINT "schedule_quotas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_week_start_key" UNIQUE ("week_start");



ALTER TABLE ONLY "public"."scheduling_rules"
    ADD CONSTRAINT "scheduling_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_catalog_uploads"
    ADD CONSTRAINT "supplier_catalog_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_product_number_key" UNIQUE ("product_number");



ALTER TABLE ONLY "public"."time_off_requests"
    ADD CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."upcoming_banquets"
    ADD CONSTRAINT "upcoming_banquets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_features"
    ADD CONSTRAINT "weekly_features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workbook_chunks"
    ADD CONSTRAINT "workbook_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workbook_sheets"
    ADD CONSTRAINT "workbook_sheets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workbooks"
    ADD CONSTRAINT "workbooks_pkey" PRIMARY KEY ("id");



CREATE INDEX "briefings_destination_idx" ON "public"."briefings" USING "btree" ("destination");



CREATE INDEX "coverage_exceptions_week" ON "public"."coverage_exceptions" USING "btree" ("week_start");



CREATE INDEX "dish_ingredients_name_idx" ON "public"."dish_ingredients" USING "btree" ("ingredient_name");



CREATE UNIQUE INDEX "employee_availability_default_unique" ON "public"."employee_availability" USING "btree" ("employee_id", "day_of_week") WHERE ("week_start" IS NULL);



CREATE INDEX "employee_availability_emp" ON "public"."employee_availability" USING "btree" ("employee_id");



CREATE INDEX "employee_availability_week" ON "public"."employee_availability" USING "btree" ("week_start");



CREATE UNIQUE INDEX "employee_availability_week_unique" ON "public"."employee_availability" USING "btree" ("employee_id", "week_start", "day_of_week") WHERE ("week_start" IS NOT NULL);



CREATE UNIQUE INDEX "employees_name_unique" ON "public"."employees" USING "btree" ("lower"("name"));



CREATE INDEX "generation_runs_week" ON "public"."generation_runs" USING "btree" ("week_start");



CREATE INDEX "idx_briefing_tasks_briefing_id" ON "public"."briefing_tasks" USING "btree" ("briefing_id");



CREATE INDEX "idx_briefings_date" ON "public"."briefings" USING "btree" ("date" DESC);



CREATE INDEX "idx_event_tasks_beo_id" ON "public"."event_tasks" USING "btree" ("beo_id");



CREATE INDEX "idx_time_off_requests_end_date" ON "public"."time_off_requests" USING "btree" ("end_date");



CREATE INDEX "idx_time_off_requests_start_date" ON "public"."time_off_requests" USING "btree" ("start_date");



CREATE INDEX "idx_workbook_chunks_workbook_id" ON "public"."workbook_chunks" USING "btree" ("workbook_id");



CREATE INDEX "idx_workbook_sheets_workbook_id" ON "public"."workbook_sheets" USING "btree" ("workbook_id");



CREATE INDEX "ingredient_products_product_idx" ON "public"."ingredient_products" USING "btree" ("product_id");



CREATE INDEX "management_note_likes_note_id_idx" ON "public"."management_note_likes" USING "btree" ("note_id");



CREATE INDEX "menu_dishes_status_idx" ON "public"."menu_dishes" USING "btree" ("status", "menu_source", "menu_section");



CREATE INDEX "office_notifications_created_at_idx" ON "public"."office_notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "pending_beo_imports_status_created_idx" ON "public"."pending_beo_imports" USING "btree" ("status", "created_at" DESC);



CREATE UNIQUE INDEX "schedule_pins_default_unique" ON "public"."schedule_pins" USING "btree" ("employee_id", "station", "shift_type", COALESCE("start_time", '00:00:00'::time without time zone)) WHERE ("week_start" IS NULL);



CREATE INDEX "schedule_pins_week" ON "public"."schedule_pins" USING "btree" ("week_start");



CREATE UNIQUE INDEX "schedule_pins_week_unique" ON "public"."schedule_pins" USING "btree" ("employee_id", "station", "shift_type", COALESCE("start_time", '00:00:00'::time without time zone), "week_start") WHERE ("week_start" IS NOT NULL);



CREATE UNIQUE INDEX "schedule_quotas_default_unique" ON "public"."schedule_quotas" USING "btree" ("employee_id", "station", COALESCE("shift_type", ''::"text"), COALESCE("start_time", '00:00:00'::time without time zone)) WHERE ("week_start" IS NULL);



CREATE INDEX "schedule_quotas_week" ON "public"."schedule_quotas" USING "btree" ("week_start");



CREATE UNIQUE INDEX "schedule_quotas_week_unique" ON "public"."schedule_quotas" USING "btree" ("employee_id", "station", COALESCE("shift_type", ''::"text"), COALESCE("start_time", '00:00:00'::time without time zone), "week_start") WHERE ("week_start" IS NOT NULL);



CREATE INDEX "scheduling_rules_week" ON "public"."scheduling_rules" USING "btree" ("week_start");



CREATE INDEX "supplier_products_category_idx" ON "public"."supplier_products" USING "btree" ("category");



CREATE INDEX "supplier_products_description_idx" ON "public"."supplier_products" USING "gin" ("to_tsvector"('"english"'::"regconfig", "description"));



CREATE INDEX "supplier_products_product_number_idx" ON "public"."supplier_products" USING "btree" ("product_number");



CREATE INDEX "time_off_requests_end_date_idx" ON "public"."time_off_requests" USING "btree" ("end_date");



CREATE INDEX "time_off_requests_start_date_idx" ON "public"."time_off_requests" USING "btree" ("start_date");



CREATE UNIQUE INDEX "weekly_features_unique" ON "public"."weekly_features" USING "btree" ("week_start", "day_of_week", "meal");



CREATE INDEX "workbook_chunks_embedding_idx" ON "public"."workbook_chunks" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



ALTER TABLE ONLY "public"."briefing_tasks"
    ADD CONSTRAINT "briefing_tasks_briefing_id_fkey" FOREIGN KEY ("briefing_id") REFERENCES "public"."briefings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dish_ingredients"
    ADD CONSTRAINT "dish_ingredients_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "public"."menu_dishes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_availability"
    ADD CONSTRAINT "employee_availability_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_order_items"
    ADD CONSTRAINT "event_order_items_beo_id_fkey" FOREIGN KEY ("beo_id") REFERENCES "public"."banquet_event_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_recipes"
    ADD CONSTRAINT "event_recipes_beo_id_fkey" FOREIGN KEY ("beo_id") REFERENCES "public"."banquet_event_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_recipes"
    ADD CONSTRAINT "event_recipes_workbook_id_fkey" FOREIGN KEY ("workbook_id") REFERENCES "public"."workbooks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_tasks"
    ADD CONSTRAINT "event_tasks_beo_id_fkey" FOREIGN KEY ("beo_id") REFERENCES "public"."banquet_event_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_tasks"
    ADD CONSTRAINT "event_tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."event_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generation_runs"
    ADD CONSTRAINT "generation_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ingredient_products"
    ADD CONSTRAINT "ingredient_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."supplier_products"("id");



ALTER TABLE ONLY "public"."management_note_likes"
    ADD CONSTRAINT "management_note_likes_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."management_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_pins"
    ADD CONSTRAINT "schedule_pins_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_quotas"
    ADD CONSTRAINT "schedule_quotas_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workbook_chunks"
    ADD CONSTRAINT "workbook_chunks_workbook_id_fkey" FOREIGN KEY ("workbook_id") REFERENCES "public"."workbooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workbook_sheets"
    ADD CONSTRAINT "workbook_sheets_workbook_id_fkey" FOREIGN KEY ("workbook_id") REFERENCES "public"."workbooks"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all anon operations on banquet_event_orders" ON "public"."banquet_event_orders" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all anon operations on event_tasks" ON "public"."event_tasks" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all authenticated operations on banquet_event_orders" ON "public"."banquet_event_orders" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all authenticated operations on event_tasks" ON "public"."event_tasks" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on briefing_tasks" ON "public"."briefing_tasks" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on briefings" ON "public"."briefings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on management_notes" ON "public"."management_notes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on recipe_categories" ON "public"."recipe_categories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on sales_data" ON "public"."sales_data" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on upcoming_banquets" ON "public"."upcoming_banquets" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on weekly_features" ON "public"."weekly_features" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on workbook_chunks" ON "public"."workbook_chunks" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on workbook_sheets" ON "public"."workbook_sheets" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated full access on workbooks" ON "public"."workbooks" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access" ON "public"."sales_data" FOR SELECT USING (true);



CREATE POLICY "Allow service role insert" ON "public"."sales_data" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable all access" ON "public"."upcoming_banquets" USING (true);



CREATE POLICY "Enable all for all users" ON "public"."briefing_tasks" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for all users" ON "public"."briefings" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for all users" ON "public"."management_note_likes" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for all users" ON "public"."management_notes" USING (true);



CREATE POLICY "Enable all for all users" ON "public"."weekly_features" USING (true);



CREATE POLICY "Enable all for all users" ON "public"."workbook_chunks" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for all users" ON "public"."workbook_sheets" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for all users" ON "public"."workbooks" USING (true) WITH CHECK (true);



CREATE POLICY "Enable insert, update, delete for all users" ON "public"."recipe_categories" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."recipe_categories" FOR SELECT USING (true);



CREATE POLICY "allow_all_coverage_exceptions" ON "public"."coverage_exceptions" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_coverage_slots" ON "public"."coverage_slots" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_dish_ingredients" ON "public"."dish_ingredients" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_employee_availability" ON "public"."employee_availability" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_employees" ON "public"."employees" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_event_order_items" ON "public"."event_order_items" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_event_recipes" ON "public"."event_recipes" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_generation_runs" ON "public"."generation_runs" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_ingredient_products" ON "public"."ingredient_products" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_menu_dishes" ON "public"."menu_dishes" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_office_notifications" ON "public"."office_notifications" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_pending_beo_imports" ON "public"."pending_beo_imports" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_schedule_pins" ON "public"."schedule_pins" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_schedule_quotas" ON "public"."schedule_quotas" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_schedules" ON "public"."schedules" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_scheduling_rules" ON "public"."scheduling_rules" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_supplier_catalog_uploads" ON "public"."supplier_catalog_uploads" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_supplier_products" ON "public"."supplier_products" USING (true) WITH CHECK (true);



ALTER TABLE "public"."banquet_event_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."briefing_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."briefings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coverage_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coverage_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dish_ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."generation_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredient_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."management_note_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."management_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."menu_dishes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."office_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_beo_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_pins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_quotas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduling_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_catalog_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_off_delete_all" ON "public"."time_off_requests" FOR DELETE USING (true);



CREATE POLICY "time_off_insert_all" ON "public"."time_off_requests" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."time_off_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_off_requests_delete_all" ON "public"."time_off_requests" FOR DELETE USING (true);



CREATE POLICY "time_off_requests_insert_all" ON "public"."time_off_requests" FOR INSERT WITH CHECK (true);



CREATE POLICY "time_off_requests_select_all" ON "public"."time_off_requests" FOR SELECT USING (true);



CREATE POLICY "time_off_requests_update_all" ON "public"."time_off_requests" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "time_off_select_all" ON "public"."time_off_requests" FOR SELECT USING (true);



ALTER TABLE "public"."upcoming_banquets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workbook_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workbook_sheets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workbooks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."coverage_exceptions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."coverage_slots";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."employee_availability";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."employees";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_order_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_recipes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_tasks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."generation_runs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."management_note_likes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."management_notes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."office_notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."pending_beo_imports";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."schedule_pins";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."schedule_quotas";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."schedules";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."scheduling_rules";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."time_off_requests";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."dish_ingredient_names"() TO "anon";
GRANT ALL ON FUNCTION "public"."dish_ingredient_names"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dish_ingredient_names"() TO "service_role";



GRANT ALL ON FUNCTION "public"."dish_spec_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."dish_spec_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dish_spec_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_dates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."menu_dish_sources"() TO "anon";
GRANT ALL ON FUNCTION "public"."menu_dish_sources"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."menu_dish_sources"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."save_dish_spec"("p_dish_id" "uuid", "p_basis" "text", "p_note" "text", "p_ingredients" "jsonb", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_dish_spec"("p_dish_id" "uuid", "p_basis" "text", "p_note" "text", "p_ingredients" "jsonb", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_dish_spec"("p_dish_id" "uuid", "p_basis" "text", "p_note" "text", "p_ingredients" "jsonb", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_dish_spec_drafts"("p_specs" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_dish_spec_drafts"("p_specs" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_dish_spec_drafts"("p_specs" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_supplier_categories"("rows" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_supplier_categories"("rows" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_supplier_categories"("rows" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."supplier_categories"() TO "anon";
GRANT ALL ON FUNCTION "public"."supplier_categories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."supplier_categories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_ingredient_product_drafts"("p_rows" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_ingredient_product_drafts"("p_rows" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_ingredient_product_drafts"("p_rows" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_menu_dish_drafts"("p_dishes" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_menu_dish_drafts"("p_dishes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_menu_dish_drafts"("p_dishes" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."banquet_event_orders" TO "anon";
GRANT ALL ON TABLE "public"."banquet_event_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."banquet_event_orders" TO "service_role";



GRANT ALL ON TABLE "public"."briefing_tasks" TO "anon";
GRANT ALL ON TABLE "public"."briefing_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."briefing_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."briefings" TO "anon";
GRANT ALL ON TABLE "public"."briefings" TO "authenticated";
GRANT ALL ON TABLE "public"."briefings" TO "service_role";



GRANT ALL ON TABLE "public"."coverage_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."coverage_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."coverage_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."coverage_slots" TO "anon";
GRANT ALL ON TABLE "public"."coverage_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."coverage_slots" TO "service_role";



GRANT ALL ON TABLE "public"."dish_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."dish_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."dish_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient_products" TO "anon";
GRANT ALL ON TABLE "public"."ingredient_products" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient_products" TO "service_role";



GRANT ALL ON TABLE "public"."menu_dishes" TO "anon";
GRANT ALL ON TABLE "public"."menu_dishes" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_dishes" TO "service_role";



GRANT ALL ON TABLE "public"."orderable_menu_dishes" TO "anon";
GRANT ALL ON TABLE "public"."orderable_menu_dishes" TO "authenticated";
GRANT ALL ON TABLE "public"."orderable_menu_dishes" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_products" TO "anon";
GRANT ALL ON TABLE "public"."supplier_products" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_products" TO "service_role";



GRANT ALL ON TABLE "public"."dish_ingredient_lines" TO "anon";
GRANT ALL ON TABLE "public"."dish_ingredient_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."dish_ingredient_lines" TO "service_role";



GRANT ALL ON TABLE "public"."employee_availability" TO "anon";
GRANT ALL ON TABLE "public"."employee_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_availability" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."event_order_items" TO "anon";
GRANT ALL ON TABLE "public"."event_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."event_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."event_recipes" TO "anon";
GRANT ALL ON TABLE "public"."event_recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."event_recipes" TO "service_role";



GRANT ALL ON TABLE "public"."event_tasks" TO "anon";
GRANT ALL ON TABLE "public"."event_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."event_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."generation_runs" TO "anon";
GRANT ALL ON TABLE "public"."generation_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."generation_runs" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient_usage" TO "anon";
GRANT ALL ON TABLE "public"."ingredient_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient_usage" TO "service_role";



GRANT ALL ON TABLE "public"."management_note_likes" TO "anon";
GRANT ALL ON TABLE "public"."management_note_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."management_note_likes" TO "service_role";



GRANT ALL ON TABLE "public"."management_notes" TO "anon";
GRANT ALL ON TABLE "public"."management_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."management_notes" TO "service_role";



GRANT ALL ON TABLE "public"."office_notifications" TO "anon";
GRANT ALL ON TABLE "public"."office_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."office_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."pending_beo_imports" TO "anon";
GRANT ALL ON TABLE "public"."pending_beo_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_beo_imports" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_categories" TO "anon";
GRANT ALL ON TABLE "public"."recipe_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_categories" TO "service_role";



GRANT ALL ON TABLE "public"."sales_data" TO "anon";
GRANT ALL ON TABLE "public"."sales_data" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_data" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_pins" TO "anon";
GRANT ALL ON TABLE "public"."schedule_pins" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_pins" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_quotas" TO "anon";
GRANT ALL ON TABLE "public"."schedule_quotas" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_quotas" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."scheduling_rules" TO "anon";
GRANT ALL ON TABLE "public"."scheduling_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduling_rules" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_catalog_uploads" TO "anon";
GRANT ALL ON TABLE "public"."supplier_catalog_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_catalog_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."time_off_requests" TO "anon";
GRANT ALL ON TABLE "public"."time_off_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."time_off_requests" TO "service_role";



GRANT ALL ON TABLE "public"."upcoming_banquets" TO "anon";
GRANT ALL ON TABLE "public"."upcoming_banquets" TO "authenticated";
GRANT ALL ON TABLE "public"."upcoming_banquets" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_features" TO "anon";
GRANT ALL ON TABLE "public"."weekly_features" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_features" TO "service_role";



GRANT ALL ON TABLE "public"."workbook_chunks" TO "anon";
GRANT ALL ON TABLE "public"."workbook_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."workbook_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."workbook_sheets" TO "anon";
GRANT ALL ON TABLE "public"."workbook_sheets" TO "authenticated";
GRANT ALL ON TABLE "public"."workbook_sheets" TO "service_role";



GRANT ALL ON TABLE "public"."workbooks" TO "anon";
GRANT ALL ON TABLE "public"."workbooks" TO "authenticated";
GRANT ALL ON TABLE "public"."workbooks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































