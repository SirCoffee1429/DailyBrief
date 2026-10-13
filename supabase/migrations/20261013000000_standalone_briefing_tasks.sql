-- Standalone kitchen tasks: added from the office Tasks tab without writing a briefing.
-- A task now belongs EITHER to a briefing (briefing_id, shown on the briefing's date) OR stands
-- alone with its own date (briefing_id NULL). Standalone tasks go to the kitchen (BOH) only.
-- Additive only: existing rows and the deployed app are unaffected.

alter table public.briefing_tasks
    alter column briefing_id drop not null,
    add column date date,
    add column created_at timestamptz not null default now();

-- Every task must be reachable by some day: through its briefing or its own date.
alter table public.briefing_tasks
    add constraint briefing_tasks_briefing_or_date
    check (briefing_id is not null or date is not null);

-- The kitchen dashboard and Tasks tab look standalone tasks up by date.
create index if not exists idx_briefing_tasks_standalone_date
    on public.briefing_tasks (date)
    where briefing_id is null;
