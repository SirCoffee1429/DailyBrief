-- The approval workflow added in 20260806000000 is the first thing that ever
-- UPDATEs this table. RLS was enabled with policies for select / insert / delete
-- only, and with no UPDATE policy Postgres matches zero rows and returns NO
-- error — so Approve and Deny were silent no-ops until this landed.
--
-- Matches the permissive posture of the existing time_off_requests policies
-- (the app is anon-key only, gated by a client-side password).

drop policy if exists time_off_requests_update_all on public.time_off_requests;
create policy time_off_requests_update_all
  on public.time_off_requests
  for update
  using (true)
  with check (true);
