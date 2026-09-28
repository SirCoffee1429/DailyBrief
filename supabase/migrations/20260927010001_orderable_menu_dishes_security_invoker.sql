-- Make orderable_menu_dishes run with the CALLER's rights, like every other view here.
--
-- It was created on 2026-09-19 without security_invoker, so it ran with its owner's
-- rights and bypassed RLS on menu_dishes — the database linter's only ERROR-level
-- finding (2026-09-27 drift audit). No real exposure: menu_dishes' policy is allow-all,
-- so every caller sees the same rows either way. This brings it in line with
-- dish_ingredient_lines and ingredient_usage, which read through it and are already
-- security_invoker.
--
-- NOTE for anyone redefining this view: CREATE OR REPLACE VIEW REPLACES the view's
-- options with whatever its WITH clause lists, so a redefinition without
-- `with (security_invoker = on)` silently switches this back off.

alter view public.orderable_menu_dishes set (security_invoker = on);
