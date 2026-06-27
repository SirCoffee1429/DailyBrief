-- Acknowledgements ("likes") for Department Communication notes.
-- One acknowledgement per device per note (toggleable), keyed by device_id but
-- displaying author_name. See docs/superpowers/specs/2026-06-26-management-likes-and-name-storage-design.md

create table if not exists public.management_note_likes (
    id          uuid primary key default gen_random_uuid(),
    note_id     uuid not null references public.management_notes(id) on delete cascade,
    device_id   text not null,
    author_name text not null,
    created_at  timestamptz default now(),
    unique (note_id, device_id)
);

create index if not exists management_note_likes_note_id_idx
    on public.management_note_likes (note_id);

-- RLS: mirror the permissive anon policy used by management_notes (no real auth yet).
alter table public.management_note_likes enable row level security;

drop policy if exists "Enable all for all users" on public.management_note_likes;
create policy "Enable all for all users"
    on public.management_note_likes
    for all
    using (true)
    with check (true);

-- Realtime: publish both the notes table (not previously published) and the likes
-- table so posts and acknowledgements sync live across devices.
alter publication supabase_realtime add table public.management_notes;
alter publication supabase_realtime add table public.management_note_likes;
