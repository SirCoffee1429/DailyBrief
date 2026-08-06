-- Approval workflow for time off requests. Previously this table was purely a
-- visibility tool with no status at all (see the comment at the top of
-- app/src/pages/TimeOff.jsx before this change).
--
-- The column is added with default 'approved' so the 148 rows that already
-- existed — which predate the workflow and have effectively been accepted by
-- silence — are backfilled in place, then the default is switched to 'pending'
-- for new submissions. Without this the office would open to a badge of 148.
-- To reverse the backfill, target rows with created_at earlier than this
-- migration.
--
-- Semantics agreed with the owner:
--   pending  — awaiting office review; still holds a slot against the 3-person
--              daily cap, so nobody is told a day is open while three people
--              are waiting on an answer for it
--   approved — confirmed off
--   denied   — hidden from the shared calendar (the person is not off, so their
--              name must not imply it) but kept in the office list as a record

alter table public.time_off_requests
  add column status text not null default 'approved'
  check (status in ('pending', 'approved', 'denied'));

alter table public.time_off_requests
  alter column status set default 'pending';
