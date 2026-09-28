-- Drop an orphan sign-up trigger that would break Supabase Auth sign-up.
--
-- Found in the 2026-09-27 drift audit. Neither object was ever in this repo (probably left
-- from an early project template). The trigger fires AFTER INSERT on auth.users and
-- inserts into public.profiles, a table that does not exist, so the insert raises and
-- the sign-up that fired it rolls back. Harmless today only because the app uses no
-- Supabase Auth (the office password is client-side). It would have broken the "real auth"
-- future plan on its first sign-up.
--
-- For the record, the dropped definitions were exactly:
--
--   CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--       FOR EACH ROW EXECUTE FUNCTION handle_new_user();
--
--   CREATE OR REPLACE FUNCTION public.handle_new_user()
--    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
--   AS $function$
--   BEGIN
--       INSERT INTO public.profiles (id, email, full_name, role)
--       VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name',
--               'manager'  -- Default role for OH
--       );
--       RETURN NEW;
--   END;
--   $function$
--
-- Real auth, when it comes, should design its own profile row rather than revive this.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
