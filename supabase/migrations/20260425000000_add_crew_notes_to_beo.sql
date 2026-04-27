-- Per-event shared crew notes (read/write by both Kitchen and Office)
-- Distinct from notes_text which is the parsed Notes block from the BEO PDF

alter table banquet_event_orders
    add column if not exists crew_notes text;
