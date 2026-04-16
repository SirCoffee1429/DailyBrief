-- Adds a destination column to briefings so each briefing can be routed to
-- the Back of House (kitchen), Front of House, or both. Existing rows default
-- to 'boh' because the kitchen dashboard was the only consumer prior to this
-- migration.

ALTER TABLE public.briefings
    ADD COLUMN IF NOT EXISTS destination text NOT NULL DEFAULT 'boh'
    CHECK (destination IN ('boh', 'foh', 'both'));

CREATE INDEX IF NOT EXISTS briefings_destination_idx ON public.briefings (destination);
