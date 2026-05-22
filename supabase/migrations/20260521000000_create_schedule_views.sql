-- Migration: Weekly Schedule Viewer
-- Creates the schedules table to store AI-parsed schedules.
-- Also registers a public storage bucket named 'schedules' for PDF/image assets.

CREATE TABLE IF NOT EXISTS public.schedules (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    timestamptz NOT NULL DEFAULT now(),
    week_start    date        NOT NULL UNIQUE, -- Enforces exactly one schedule per week_start date
    schedule_data jsonb       NOT NULL,        -- Stores structured shift lists and announcements
    file_name     text,
    file_url      text,                        -- Link to the original file in Supabase Storage
    raw_text      text                         -- Raw OCR / AI text output
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Open RLS policy matching the existing app pattern
CREATE POLICY "allow_all_schedules"
    ON public.schedules
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable real-time for schedules so both dashboard screens auto-refresh
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;

-- Create schedules bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('schedules', 'schedules', true)
ON CONFLICT (id) DO NOTHING;

-- Open policies for the schedules storage bucket objects
CREATE POLICY "schedules_storage_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'schedules');

CREATE POLICY "schedules_storage_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'schedules');

CREATE POLICY "schedules_storage_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'schedules');
