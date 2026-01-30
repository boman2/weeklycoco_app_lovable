-- Add closing_dates column to stores table for managing store closing dates from DB
-- This will store an array of date strings like ['2024-12-08', '2024-12-10', '2024-12-24']
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS closing_dates text[] DEFAULT '{}'::text[];

-- Add a comment explaining the column
COMMENT ON COLUMN public.stores.closing_dates IS 'Array of dates when the store is closed, format: YYYY-MM-DD';