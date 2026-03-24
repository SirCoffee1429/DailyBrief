-- Detailed Banquet Event Orders (BEOs)
create table if not exists banquet_event_orders (
    id uuid default gen_random_uuid() primary key,
    event_name text not null,
    event_date date not null,
    start_time text,
    guest_count integer,
    food_items jsonb default '[]'::jsonb, -- Array of { item: string, quantity: string|number }
    raw_text text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table banquet_event_orders enable row level security;

-- Policies
create policy "Allow all authenticated operations on banquet_event_orders"
on banquet_event_orders for all
to authenticated
using (true)
with check (true);

create policy "Allow all anon operations on banquet_event_orders"
on banquet_event_orders for all
to anon
using (true)
with check (true);
