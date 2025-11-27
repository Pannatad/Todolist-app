-- Run this in your Supabase SQL Editor to fix the "Failed to save" error

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_time INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;

-- Optional: If you want to backfill existing tasks with a default value (e.g. 0)
-- UPDATE tasks SET estimated_time = 0 WHERE estimated_time IS NULL;
