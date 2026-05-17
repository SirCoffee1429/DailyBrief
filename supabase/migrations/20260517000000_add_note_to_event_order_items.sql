-- Add optional per-item note to event order list items.
-- Allows office staff to annotate individual ingredients (e.g. "3 cases", "check walk-in first").

alter table event_order_items
    add column note text;
