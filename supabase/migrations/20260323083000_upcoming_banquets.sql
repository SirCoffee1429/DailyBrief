create table if not exists upcoming_banquets (
    id uuid default gen_random_uuid() primary key,
    event_date date not null,
    event_name text not null,
    start_time text,
    location text,
    guest_count integer,
    event_type text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on row level security
alter table upcoming_banquets enable row level security;

-- Policies
create policy "Allow all authenticated operations on upcoming_banquets"
on upcoming_banquets for all
to authenticated
using (true)
with check (true);

create policy "Allow all anon operations on upcoming_banquets"
on upcoming_banquets for all
to anon
using (true)
with check (true);
