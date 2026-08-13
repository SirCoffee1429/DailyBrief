-- Queue for BEOs that arrive by email (Postmark inbound webhook) instead of
-- through the manual upload on the Events page.
--
-- Emailed BEOs are almost always UPDATES to an event the crew is already working
-- from, so they are never applied automatically. A row lands here as 'pending',
-- the office reviews a diff against the live event, and only an explicit Approve
-- replays it through process-beo Mode B (which updates in place and preserves
-- event_tasks, event_order_items and crew_notes).

create table if not exists public.pending_beo_imports (
    id                  uuid primary key default gen_random_uuid(),
    created_at          timestamptz not null default now(),

    -- Idempotency guard. Postmark retries a non-200 up to 10 times over ~10.5
    -- hours, so without this a slow or failed response would queue the same
    -- email repeatedly. UNIQUE turns a retry into a collision the webhook can
    -- detect and ack, rather than a duplicate row.
    postmark_message_id text not null unique,

    from_email          text not null,
    subject             text,

    -- Path in the private 'beo-emails' bucket. Postmark truncates anything over
    -- 1MB and does not host attachments, so this is the only copy of record.
    pdf_path            text,

    -- processing  → accepted, Gemini parse still running in the background
    -- pending     → parsed, waiting on the office
    -- parse_failed→ Gemini failed; kept visible so a bad parse is never a
    --               silently dropped email
    -- approved    → replayed into banquet_event_orders
    -- discarded   → dismissed without applying
    status              text not null default 'processing'
        check (status in ('processing', 'pending', 'parse_failed', 'approved', 'discarded')),

    -- Gemini output, in the exact shape process-beo Mode B expects as
    -- `parsedEvents`, so Approve is a replay rather than a re-parse.
    parsed_events       jsonb,
    error_text          text,
    resolved_at         timestamptz
);

-- The queue UI and the sidebar badge both filter on status and order by recency.
create index if not exists pending_beo_imports_status_created_idx
    on public.pending_beo_imports (status, created_at desc);

-- RLS: mirror the permissive anon policy used by office_notifications and
-- time_off_requests (the app is anon-key only, gated by a client-side password).
-- Note this table is written by the webhook using the service role, which
-- bypasses RLS; these policies exist for the office UI's reads and updates.
alter table public.pending_beo_imports enable row level security;

drop policy if exists allow_all_pending_beo_imports on public.pending_beo_imports;
create policy allow_all_pending_beo_imports
    on public.pending_beo_imports
    for all
    using (true)
    with check (true);

-- Realtime so the queue panel and the Events badge update without a refresh.
alter publication supabase_realtime add table public.pending_beo_imports;

-- Storage for the original attachments.
--
-- Non-public, unlike the existing 'workbooks' and 'schedules' buckets: a BEO PDF
-- carries the Primary Contact block (member name, address, email, phone) that
-- the parser deliberately ignores, so it should not be reachable at a guessable
-- permanent URL. Reads go through createSignedUrl, not getPublicUrl.
--
-- Be honest about how much that buys: the select policy below grants the anon
-- role read access, and the anon key ships in the client bundle. This stops
-- casual URL sharing and search-engine exposure; it is NOT a defense against
-- someone who pulls the key out of the bundle. That is the same posture as every
-- other table here (allow-all RLS behind a client-side password) — noted rather
-- than silently assumed. Real isolation would mean minting signed URLs from an
-- edge function with the service role and dropping this policy.
insert into storage.buckets (id, name, public)
values ('beo-emails', 'beo-emails', false)
on conflict (id) do nothing;

-- The webhook uploads with the service role, but the office UI needs to read the
-- object to mint a signed URL for the "view original" link.
drop policy if exists allow_read_beo_emails on storage.objects;
create policy allow_read_beo_emails
    on storage.objects
    for select
    using (bucket_id = 'beo-emails');
