-- Migration: Auto-Scheduler Phase 1 — Roster + Availability
-- Creates the employees and employee_availability tables per
-- docs/auto-scheduler-design.md §3. Free-form availability model:
-- week_start NULL = recurring default week, dated = per-week override,
-- no row = fully available.

CREATE TABLE IF NOT EXISTS public.employees (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    name                  text        NOT NULL,
    active                boolean     NOT NULL DEFAULT true,
    eligible_shift_types  text[]      NOT NULL DEFAULT '{}',
    trained_stations      text[]      NOT NULL DEFAULT '{}',
    primary_station       text,
    max_weekly_hours      numeric     NOT NULL DEFAULT 40 CHECK (max_weekly_hours > 0),
    target_weekly_hours   numeric,
    typical_days_per_week int         CHECK (typical_days_per_week BETWEEN 1 AND 7),
    availability_notes    text,
    notes                 text
);

-- Grid keys shifts by employee name string, so names must be unique
CREATE UNIQUE INDEX IF NOT EXISTS employees_name_unique
    ON public.employees (lower(name));

CREATE TABLE IF NOT EXISTS public.employee_availability (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    employee_id  uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    week_start   date,
    day_of_week  int         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    status       text        NOT NULL DEFAULT 'available',
    start_time   time,
    end_time     time,
    note         text
);

-- One entry per employee per day per week-context (NULLs not equal in unique
-- indexes, so the recurring default week needs a partial index pair)
CREATE UNIQUE INDEX IF NOT EXISTS employee_availability_default_unique
    ON public.employee_availability (employee_id, day_of_week)
    WHERE week_start IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employee_availability_week_unique
    ON public.employee_availability (employee_id, week_start, day_of_week)
    WHERE week_start IS NOT NULL;

CREATE INDEX IF NOT EXISTS employee_availability_emp
    ON public.employee_availability (employee_id);
CREATE INDEX IF NOT EXISTS employee_availability_week
    ON public.employee_availability (week_start);

-- Open RLS matching the existing app pattern (no real auth yet)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_employees" ON public.employees
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_employee_availability" ON public.employee_availability
    FOR ALL USING (true) WITH CHECK (true);

-- Realtime so crew availability edits appear live on the office side
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_availability;
