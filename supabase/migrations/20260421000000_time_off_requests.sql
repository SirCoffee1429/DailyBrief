-- Time off requests submitted by kitchen crew. Anyone on /kitchen can submit a
-- request by typing their name; office can view and delete. No approval
-- workflow — the calendar is a visibility tool, not a workflow.

CREATE TABLE IF NOT EXISTS public.time_off_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    employee_name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    -- 'full' = all day, 'am' = morning only, 'pm' = afternoon/evening only,
    -- 'custom' = specific start_time / end_time
    time_type text NOT NULL DEFAULT 'full'
        CHECK (time_type IN ('full', 'am', 'pm', 'custom')),
    start_time time,
    end_time time,
    CHECK (end_date >= start_date),
    CHECK (
        time_type <> 'custom'
        OR (start_time IS NOT NULL AND end_time IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS time_off_requests_start_date_idx
    ON public.time_off_requests (start_date);

CREATE INDEX IF NOT EXISTS time_off_requests_end_date_idx
    ON public.time_off_requests (end_date);

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Match the open pattern used by the rest of the app (no real auth yet).
CREATE POLICY "time_off_requests_select_all"
    ON public.time_off_requests FOR SELECT
    USING (true);

CREATE POLICY "time_off_requests_insert_all"
    ON public.time_off_requests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "time_off_requests_delete_all"
    ON public.time_off_requests FOR DELETE
    USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.time_off_requests;
