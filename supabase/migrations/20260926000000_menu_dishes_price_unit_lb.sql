-- Hand-carved meats are sold by weight: "Beef Tenderloin $180 / 4lbs". With no pound
-- unit, that stored as "$180 buys 4" of nothing. price_qty already carries the 4;
-- this only lets the unit say what the 4 counts.
alter table public.menu_dishes drop constraint menu_dishes_price_unit_check;
alter table public.menu_dishes add constraint menu_dishes_price_unit_check
    check (price_unit in ('each','person','dozen','tray','piece','lb'));
