-- Expand banquet_event_orders to capture full BEO structure
-- Adds: location, event_end_date, timeline rows, structured day/meal sections, notes

alter table banquet_event_orders
    add column if not exists location text,
    add column if not exists event_end_date date,
    add column if not exists timeline jsonb default '[]'::jsonb,
    add column if not exists sections jsonb default '[]'::jsonb,
    add column if not exists notes_text text;

-- timeline shape: [{ date: "YYYY-MM-DD", time: "7:00am", item: "Range Opens", description: "..." }]
-- sections shape: [
--   {
--     date: "YYYY-MM-DD",
--     day_label: "Sat, 04/25/2026",
--     meal_type: "Breakfast",
--     time: "7:00am",
--     location: "Hitching Post",
--     categories: [
--       {
--         name: "Member Event - Buffets",
--         items: [{ label: "Custom Buffets", description: "...", qty: "73" }]
--       }
--     ]
--   }
-- ]
