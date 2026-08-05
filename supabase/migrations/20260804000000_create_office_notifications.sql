-- Office notification feed: new time off requests, cancellations, and crew
-- availability changes, surfaced as a bell in the office topbar.
--
-- Rows are written by the app rather than by DB triggers. There is no auth yet,
-- so every write reaches Postgres as the anon role and the database cannot tell
-- a crew submission from an office one. The app can (/kitchen/time-off renders
-- TimeOff plain, /office/time-off renders it with officeMode), so writing from
-- the client is what lets us suppress office-initiated self-noise.

create table if not exists public.office_notifications (
    id         uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    kind       text not null check (kind in ('time_off_created', 'time_off_cancelled', 'availability_changed')),
    -- Denormalized at write time so a notification survives its source row being
    -- deleted, which is exactly the cancellation case.
    actor_name text not null,
    summary    text not null,
    link       text not null
);

create index if not exists office_notifications_created_at_idx
    on public.office_notifications (created_at desc);

-- RLS: mirror the permissive anon policy used by employees / time_off_requests
-- (the app is anon-key only, gated by a client-side password).
alter table public.office_notifications enable row level security;

drop policy if exists allow_all_office_notifications on public.office_notifications;
create policy allow_all_office_notifications
    on public.office_notifications
    for all
    using (true)
    with check (true);

-- Realtime so the bell increments without a refresh.
alter publication supabase_realtime add table public.office_notifications;
