-- The 2026 menu set added Spring and Summer seasonal menus alongside Fall and Winter.
-- Without this, 'Seasonal - Spring.pdf' could not carry a season at all and would be
-- filed as a year-round menu. Seasons still recur by MONTH, so no date columns.
alter table public.menu_dishes drop constraint menu_dishes_season_check;
alter table public.menu_dishes add constraint menu_dishes_season_check
    check (season in ('spring','summer','fall','winter'));
