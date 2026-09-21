-- A menu price can buy MORE THAN ONE of its unit, and nothing recorded that.
--
-- Found 2026-09-21 when the owner reported the prices were wrong. The hors d'oeuvres
-- menu prints "Vegetarian — Starting at $85 for 20 pieces". P2 stored base_price 85
-- with price_unit 'piece', which reads as **$85 PER PIECE** — twenty times the real
-- $4.25. It did that on 27 of 28 rows, because the prompt rule told it to.
--
-- price_qty closes the hole: base_price buys (price_qty x price_unit).
--   "$8/ea"                  -> 8,   qty 1,  each
--   "$90/tray"               -> 90,  qty 1,  tray
--   "+$115 for 20 glasses"   -> 115, qty 20, each
--   "$85 for 20 pieces"      -> 85,  qty 20, piece
--
-- Defaulting to 1 keeps every existing row's meaning unchanged.

alter table public.menu_dishes
    add column if not exists price_qty numeric not null default 1;

comment on column public.menu_dishes.price_qty is
    'How many price_unit the base_price buys. "$85 for 20 pieces" is base_price 85, '
    'price_qty 20, price_unit piece. Defaults to 1, the ordinary case.';

-- Separately: "STARTING AT $95" is a group FLOOR, not each dish's price, and the word
-- "starting" explicitly denies that they all cost the same. Asserting 95 on all six
-- chicken items was a guess wearing a number. This project's rule for that is a gap
-- with a reason, never a guess — so those prices are cleared from the dishes and kept
-- as visible text instead. The 28 hors d'oeuvres rows are all still drafts, so nothing
-- confirmed is touched.
update public.menu_dishes
   set base_price = null,
       price_unit = null,
       price_qty = 1,
       description = case
           when description is null or description = ''
               then 'Group price: from $' || base_price::text || ' for 20 pieces'
           else description || ' — group price: from $' || base_price::text || ' for 20 pieces'
       end,
       updated_at = now()
 where menu_source = 'Hors dOeuvres'
   and base_price is not null
   and status = 'draft';
