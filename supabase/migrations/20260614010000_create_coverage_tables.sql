-- Migration: Auto-Scheduler Phase 2 — Coverage Template + Exceptions
-- The "demand side" the generator (Phase 3) reads: how many people, at which
-- station, on which shift, on which days. Finalizes the docs/auto-scheduler-design.md
-- §4 sketch with `days_of_week int[]` (one row per station/day-range, matching the
-- grouped slot-card UI) instead of one row per single day.
-- Seeded verbatim from requirements Appendix A (the owner-confirmed coverage spec).
-- Day convention: Mon=0 … Sun=6 (app-wide Monday-start week).

CREATE TABLE IF NOT EXISTS public.coverage_slots (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    group_label  text        NOT NULL,                 -- UI grouping (AM Kitchen, PM Kitchen, …)
    role_label   text        NOT NULL,                 -- slot display name (Hot line cooks, Fry, …)
    shift_type   text        NOT NULL,                 -- AM | PM | Turn | Pool
    station      text,                                 -- NULL = station-less (AM line, extra cooks)
    days_of_week int[]       NOT NULL DEFAULT '{}',    -- Mon=0 … Sun=6
    headcount    int         NOT NULL DEFAULT 1 CHECK (headcount >= 0),
    start_time   time,
    end_time     time,
    seasonal     text,                                 -- NULL = always on | 'summer' = pool season
    active       boolean     NOT NULL DEFAULT true,
    sort_order   int         NOT NULL DEFAULT 0
);

-- Per-week deltas layered on top of the standing template before generation:
-- closures, Live Music (+2 PM cooks), headcount tweaks, free-text notes.
CREATE TABLE IF NOT EXISTS public.coverage_exceptions (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    week_start      date        NOT NULL,              -- Monday of the affected week
    day_of_week     int         CHECK (day_of_week BETWEEN 0 AND 6),  -- NULL = whole week
    exception_type  text        NOT NULL,              -- 'closure' | 'live_music' | 'headcount' | 'note'
    shift_type      text,
    station         text,
    headcount_delta int,                               -- +/- cooks (live_music = +2)
    note            text,
    active          boolean     NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS coverage_exceptions_week
    ON public.coverage_exceptions (week_start);

-- Open RLS matching the existing app pattern (no real auth yet)
ALTER TABLE public.coverage_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_coverage_slots" ON public.coverage_slots
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.coverage_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_coverage_exceptions" ON public.coverage_exceptions
    FOR ALL USING (true) WITH CHECK (true);

-- Realtime so template edits reflect live across open office sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.coverage_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coverage_exceptions;

-- ── Seed: Appendix A coverage spec ──────────────────────────────────────────
INSERT INTO public.coverage_slots
    (group_label, role_label, shift_type, station, days_of_week, headcount, start_time, end_time, seasonal, sort_order)
VALUES
    -- AM Kitchen (station-less; 2 hot line + 1 Salad Mon–Sat, 3 brunch Sun)
    ('AM Kitchen',  'Hot line cooks', 'AM', 'Hot Line', ARRAY[0,1,2,3,4,5], 2, '08:00', '15:30', NULL, 10),
    ('AM Kitchen',  'Salad',          'AM', 'Salad',    ARRAY[0,1,2,3,4,5], 1, '08:00', '15:30', NULL, 20),
    ('AM Kitchen',  'Brunch cooks',   'AM', 'Hot Line', ARRAY[6],           3, '08:00', '15:00', NULL, 30),

    -- PM Kitchen — 5 fixed stations Mon–Thu, +later close & +2 cooks Fri–Sat
    ('PM Kitchen',  'Fry',            'PM', 'Fry',      ARRAY[0,1,2,3], 1, '14:00', '21:30', NULL, 110),
    ('PM Kitchen',  'Flat Top',       'PM', 'Flat Top', ARRAY[0,1,2,3], 1, '14:00', '21:30', NULL, 120),
    ('PM Kitchen',  'Salad',          'PM', 'Salad',    ARRAY[0,1,2,3], 1, '14:00', '21:30', NULL, 130),
    ('PM Kitchen',  'Char',           'PM', 'Char',     ARRAY[0,1,2,3], 1, '14:00', '21:30', NULL, 140),
    ('PM Kitchen',  'Sautee',         'PM', 'Sautee',   ARRAY[0,1,2,3], 1, '14:00', '21:30', NULL, 150),
    ('PM Kitchen',  'Fry (Fri–Sat)',      'PM', 'Fry',      ARRAY[4,5], 1, '14:00', '22:30', NULL, 160),
    ('PM Kitchen',  'Flat Top (Fri–Sat)', 'PM', 'Flat Top', ARRAY[4,5], 1, '14:00', '22:30', NULL, 170),
    ('PM Kitchen',  'Salad (Fri–Sat)',    'PM', 'Salad',    ARRAY[4,5], 1, '14:00', '22:30', NULL, 180),
    ('PM Kitchen',  'Char (Fri–Sat)',     'PM', 'Char',     ARRAY[4,5], 1, '14:00', '22:30', NULL, 190),
    ('PM Kitchen',  'Sautee (Fri–Sat)',   'PM', 'Sautee',   ARRAY[4,5], 1, '14:00', '22:30', NULL, 200),
    ('PM Kitchen',  'Additional cooks (Fri–Sat)', 'PM', NULL, ARRAY[4,5], 2, '14:00', '22:30', NULL, 210),

    -- Managers — exactly 1 on duty every AM & PM (hard constraint)
    ('Managers',    'Manager (AM Mon–Sat)', 'AM', 'Manager', ARRAY[0,1,2,3,4,5], 1, '09:00', '17:00', NULL, 310),
    ('Managers',    'Manager (AM Sun)',     'AM', 'Manager', ARRAY[6],           1, '08:00', '15:30', NULL, 320),
    ('Managers',    'Manager (PM Mon–Thu)', 'PM', 'Manager', ARRAY[0,1,2,3],     1, '13:30', '21:30', NULL, 330),
    ('Managers',    'Manager (PM Fri–Sat)', 'PM', 'Manager', ARRAY[4,5],         1, '14:30', '22:30', NULL, 340),

    -- The Turn — 1/day, 7 days
    ('The Turn',    'Turn',           'Turn', 'Turn', ARRAY[0,1,2,3,4,5,6], 1, '08:00', '15:00', NULL, 410),

    -- The Pool — summer only, 1 manager + 2 cooks
    ('The Pool',    'Pool Manager',   'Pool', 'Pool Manager', ARRAY[0,1,2,3,4,5,6], 1, '09:30', '19:30', 'summer', 510),
    ('The Pool',    'Pool Cooks',     'Pool', 'Pool Cook',    ARRAY[0,1,2,3,4,5,6], 2, '10:30', '19:30', 'summer', 520),

    -- Dish — AM 7 days; PM Mon–Thu+Sun and Fri–Sat (later close)
    ('Dish',        'Dish (AM)',          'AM', 'Dish', ARRAY[0,1,2,3,4,5,6], 1, '09:00', '16:00', NULL, 610),
    ('Dish',        'Dish (PM Mon–Thu, Sun)', 'PM', 'Dish', ARRAY[0,1,2,3,6], 1, '16:00', '21:30', NULL, 620),
    ('Dish',        'Dish (PM Fri–Sat)',  'PM', 'Dish', ARRAY[4,5],          1, '16:00', '22:30', NULL, 630),

    -- Pizza Wagon — Wednesdays, year-round (weather permitting)
    ('Pizza Wagon', 'Pizza Wagon',    'PM', 'Pizza Wagon', ARRAY[2], 2, '13:30', '21:30', NULL, 710);
