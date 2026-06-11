-- Migration: Availability submission status (applied to prod 2026-06-11)
-- Tracks the crew availability submission/approval workflow per employee:
-- 'none' = never filled out, 'pending' = crew saved availability awaiting
-- office review, 'approved' = office signed off. Crew re-edits flip back to pending.
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'none';
