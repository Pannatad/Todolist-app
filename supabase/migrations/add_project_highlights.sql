-- Option 1: Separate table for project highlights (recommended for clean queries)
-- This table stores highlighted task and subtask IDs per user per project

CREATE TABLE IF NOT EXISTS project_highlights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    task_id TEXT NOT NULL,
    subtask_id TEXT, -- NULL if highlighting a task, non-null if highlighting a subtask
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique highlights per user/project/task/subtask combination
    UNIQUE(user_id, project_id, task_id, subtask_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_project_highlights_user_project 
    ON project_highlights(user_id, project_id);

-- Enable Row Level Security
ALTER TABLE project_highlights ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own highlights
CREATE POLICY "Users can view their own highlights"
    ON project_highlights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own highlights"
    ON project_highlights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
    ON project_highlights FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- Option 2: Use existing structure (no new table needed)
-- ============================================================
-- If you prefer NOT to create a new table, the highlights can be 
-- stored directly in the tasks JSONB by adding a "highlighted" 
-- boolean property to each task and subtask object.
-- No SQL changes needed for this approach - just code changes.
