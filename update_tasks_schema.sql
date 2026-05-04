-- Run this in your Supabase SQL Editor.
-- It adds persistence for task chunking/subtasks on the existing tasks table.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_time INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE tasks
SET subtasks = '[]'::jsonb
WHERE subtasks IS NULL;

ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_subtasks_is_array;

ALTER TABLE tasks
ADD CONSTRAINT tasks_subtasks_is_array
CHECK (jsonb_typeof(subtasks) = 'array');

-- Optional: If you want to backfill existing tasks with a default value (e.g. 0)
-- UPDATE tasks SET estimated_time = 0 WHERE estimated_time IS NULL;
