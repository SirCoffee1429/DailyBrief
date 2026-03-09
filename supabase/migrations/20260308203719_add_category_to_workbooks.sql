-- Add category column to workbooks table
ALTER TABLE public.workbooks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized';
