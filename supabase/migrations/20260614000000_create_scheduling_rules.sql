-- Migration: Scheduling "Source of Truth" rules
-- Manager-authored constraints/rules the auto-scheduler generator (Phase 2/3)
-- will read when building a new schedule. Mirrors the employee_availability
-- week-context model: week_start NULL = standing rule applied to every
-- schedule; dated Monday = rule scoped to that specific week only.
-- `active` lets a manager pause a rule without deleting it.

CREATE TABLE IF NOT EXISTS public.scheduling_rules (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    rule_text   text        NOT NULL,
    active      boolean     NOT NULL DEFAULT true,
    week_start  date,
    sort_order  int         NOT NULL DEFAULT 0
);

-- Per-week rules are looked up by week; standing rules (NULL) by absence of week
CREATE INDEX IF NOT EXISTS scheduling_rules_week
    ON public.scheduling_rules (week_start);

-- Open RLS matching the existing app pattern (no real auth yet)
ALTER TABLE public.scheduling_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_scheduling_rules" ON public.scheduling_rules
    FOR ALL USING (true) WITH CHECK (true);

-- Realtime so rule edits reflect live across open office sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduling_rules;
