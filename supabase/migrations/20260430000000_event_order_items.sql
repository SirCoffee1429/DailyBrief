-- Order list items per BEO event (office-only)
-- Tracks food ingredients/items that need to be purchased for an event.
-- source_dish links an ingredient back to the menu item it came from (AI-generated).
-- is_manual distinguishes user-typed items from AI-generated ones so regeneration
-- only clears the AI items, leaving manual additions intact.

create table event_order_items (
    id          uuid        primary key default gen_random_uuid(),
    beo_id      uuid        not null references banquet_event_orders(id) on delete cascade,
    item_name   text        not null,
    source_dish text,
    is_ordered  boolean     not null default false,
    is_manual   boolean     not null default false,
    sort_order  int         not null default 0,
    created_at  timestamptz not null default now()
);

alter table event_order_items enable row level security;

-- Open RLS policy matching the rest of the app (no real auth yet)
create policy "allow_all_event_order_items"
    on event_order_items
    for all
    using (true)
    with check (true);

alter publication supabase_realtime add table event_order_items;
