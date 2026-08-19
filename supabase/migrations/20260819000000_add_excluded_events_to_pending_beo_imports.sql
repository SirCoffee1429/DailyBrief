-- ReserveCloud now sends a daily packet of BEOs, and receive-beo-email drops the
-- recurring club events the kitchen does not cook for (Bridge, Canasta, Stag
-- Night and the rest).
--
-- Those events are removed from parsed_events before the row is queued, so
-- without this column there is no record of what was dropped. If the exclusion
-- list ever matches a real event, that BEO would vanish with nothing to find it
-- by. Edge function logs expire in days, so the record has to live on the row.
--
-- Nullable and additive: existing rows predate filtering and correctly read as
-- "nothing was excluded".
alter table public.pending_beo_imports
  add column if not exists excluded_events jsonb;

comment on column public.pending_beo_imports.excluded_events is
  'Event names filtered out by EXCLUDED_EVENT_NAMES in receive-beo-email, kept so a wrongly-excluded BEO is still discoverable. Null or [] means nothing was dropped.';
