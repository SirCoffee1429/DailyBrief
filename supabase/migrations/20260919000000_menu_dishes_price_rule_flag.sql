-- Mark the menu rows that carry a PRICE RULE rather than food.
--
-- "Additional Salad +$5", "Additional side +$4" and "additional dessert +$4" on Custom
-- Buffets are not dishes. The $38 package covers one salad, two sides, two entrees and
-- one dessert; anything past that count costs extra, and WHICH dish it is stays unknown
-- until the event is ordered. Pick Caesar and Pasta Salad, and the Pasta Salad becomes
-- the +$5 one — even though Pasta Salad carries no upcharge of its own. (Owner,
-- 2026-09-19.)
--
-- Why this needs a column rather than a convention: the real second salad is ALREADY a
-- row in this table and will be ordered on its own. If P3 ever attaches ingredients to
-- "Additional Salad" as well, the event orders that food twice. A rule that lives in
-- the caller is a rule the next caller forgets — the same argument that put the
-- confirmed-dish protection into upsert_menu_dish_drafts instead of the UI.
--
-- Note for later, NOT modelled here: `upcharge` currently conflates two different
-- things — an INTRINSIC premium (Chopped Cobb costs +$5 whenever it is chosen) and a
-- POSITIONAL surcharge (any second salad costs +$5 wherever it lands). Telling those
-- apart needs the package composition (1 salad / 2 sides / 2 entrees / 1 dessert),
-- which is a pricing concern and explicitly out of scope for v1 — the order guide buys
-- food, it does not quote menu prices. Recorded so the ambiguity is not rediscovered
-- as a bug.

alter table public.menu_dishes
    add column if not exists is_price_rule boolean not null default false;

-- Curated, never recomputed — exactly like supplier_products.category. The upsert's
-- ON CONFLICT list does not mention this column, so a re-draft cannot reset a judgement
-- someone made. New drafts arrive false and a human marks them.
comment on column public.menu_dishes.is_price_rule is
    'True when the row states a pricing rule (a selection surcharge) rather than a dish. '
    'Never give these ingredients and never order food for them: the dish the rule '
    'applies to is a separate row that is ordered on its own.';

-- Matched case-insensitively on purpose: the PDF prints "additional dessert" in
-- lowercase and the model stored it as "Additional dessert", so an exact IN list
-- silently caught only two of the three.
update public.menu_dishes
   set is_price_rule = true,
       updated_at = now()
 where menu_source = 'Custom Buffets'
   and lower(name) in ('additional salad', 'additional side', 'additional dessert');

-- Only confirmed, non-rule dishes are real food. P3 draws its ingredient work from here
-- so the exclusion cannot be forgotten at the call site.
create or replace view public.orderable_menu_dishes as
    select *
      from public.menu_dishes
     where status = 'confirmed'
       and is_price_rule = false;
