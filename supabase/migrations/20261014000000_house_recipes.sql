-- The kitchen's own seasonal recipe books (seasonal-recipes/<season>_recipe_book/*.pdf),
-- one row per recipe. The dish drafter reads a dish's recipe as its SOURCE instead of
-- guessing amounts, and the Dish Ingredients page shows it beside the spec under review.
--
-- recipe_text is the recipe from its title through its ingredient list — yield, "On the
-- Plate" and ingredients — and stops at the method: the owner checked the books'
-- ingredients and portions, not their methods (2026-10-14). Loaded by
-- app/scripts/recipe-book-sql.mjs, which prints the insert for one book.
create table public.house_recipes (
    id          uuid primary key default gen_random_uuid(),
    season      text not null check (season in ('spring', 'summer', 'fall', 'winter')),
    title       text not null,
    recipe_text text not null,
    source_file text not null,
    created_at  timestamptz not null default now(),
    unique (season, title)
);

-- Same open policy as menu_dishes and dish_ingredients (no real auth in this app yet).
-- RLS itself is switched on by the ensure_rls event trigger.
create policy allow_all_house_recipes on public.house_recipes
    for all using (true) with check (true);

-- A name compared without case, accents or punctuation, so the menu's "Roasted Acorn
-- Squash Purée" finds the book's recipe however either side spells the accent. No
-- unaccent extension on this project, so the book's accented letters are listed here.
create or replace function public.house_recipe_key(t text)
returns text
language sql immutable
as $$
    select ' ' || trim(regexp_replace(
        translate(lower(t), 'àáâäãèéêëìíîïòóôöõùúûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
        '[^a-z0-9]+', ' ', 'g')) || ' '
$$;

-- For each dish: the recipe that IS the dish (same season, same name; depth 0) and every
-- recipe it USES, followed down — a plated entrée's On the Plate names its sides, a
-- salad's ingredients name its sub-recipes. Only from ON THE PLATE / INGREDIENTS onward
-- is searched: a side's description points UP ("Side for the Herb-Crusted Pork
-- Tenderloin"), and searching it pulled the whole pork entrée into the buffet bread
-- pudding. Chef's notes are not in recipe_text at all. The padded keys make it a
-- whole-word match.
create or replace function public.dish_house_recipes(p_dish_ids uuid[])
returns table (dish_id uuid, recipe_id uuid, title text, recipe_text text, depth int)
language sql stable
as $$
    with recursive walk(dish_id, recipe_id, depth) as (
        select d.id, r.id, 0
          from public.menu_dishes d
          join public.house_recipes r
            on r.season = d.season
           and public.house_recipe_key(r.title) = public.house_recipe_key(d.name)
         where d.id = any(p_dish_ids)
        union
        select w.dish_id, used.id, w.depth + 1
          from walk w
          join public.house_recipes parent on parent.id = w.recipe_id
          join public.house_recipes used
            on used.season = parent.season
           and used.id <> parent.id
           and position(public.house_recipe_key(used.title) in public.house_recipe_key(
                   substring(parent.recipe_text from '(?:ON THE PLATE|INGREDIENTS)\n.*'))) > 0
         where w.depth < 3
    )
    select distinct on (w.dish_id, w.recipe_id) w.dish_id, r.id, r.title, r.recipe_text, w.depth
      from walk w
      join public.house_recipes r on r.id = w.recipe_id
     order by w.dish_id, w.recipe_id, w.depth
$$;
