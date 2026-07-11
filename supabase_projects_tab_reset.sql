-- Projects tab database reset
-- WARNING: This deletes existing Projects tab data.
-- Run this whole file in the Supabase SQL editor when you want a clean schema
-- for the redesigned Projects tab.

BEGIN;

-- Rebuild the Projects tab tables from scratch.
DROP TABLE IF EXISTS public.project_highlights CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    vision TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    deadline DATE,
    category TEXT NOT NULL DEFAULT 'General',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'archived', 'paused')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    phases JSONB NOT NULL DEFAULT '[
        {"id":"phase-1","name":"Stage 1","color":"purple","order":0}
    ]'::jsonb CHECK (jsonb_typeof(phases) = 'array'),
    columns JSONB NOT NULL DEFAULT '[
        {"id":"c-1","title":"Work tree 1"}
    ]'::jsonb CHECK (jsonb_typeof(columns) = 'array'),
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tasks) = 'array'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.project_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL CHECK (LENGTH(TRIM(task_id)) > 0),
    subtask_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_created
    ON public.projects(user_id, created_at DESC);

CREATE INDEX idx_projects_user_status
    ON public.projects(user_id, status);

CREATE INDEX idx_projects_user_pinned
    ON public.projects(user_id, is_pinned DESC, updated_at DESC);

CREATE INDEX idx_projects_deadline
    ON public.projects(user_id, deadline)
    WHERE deadline IS NOT NULL;

CREATE INDEX idx_projects_tasks_gin
    ON public.projects USING gin(tasks jsonb_path_ops);

CREATE INDEX idx_projects_phases_gin
    ON public.projects USING gin(phases jsonb_path_ops);

CREATE INDEX idx_project_highlights_user_project
    ON public.project_highlights(user_id, project_id);

CREATE UNIQUE INDEX idx_project_highlights_unique_task
    ON public.project_highlights(user_id, project_id, task_id)
    WHERE subtask_id IS NULL;

CREATE UNIQUE INDEX idx_project_highlights_unique_subtask
    ON public.project_highlights(user_id, project_id, task_id, subtask_id)
    WHERE subtask_id IS NOT NULL;

CREATE TRIGGER set_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_project_highlights_updated_at
    BEFORE UPDATE ON public.project_highlights
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own project highlights"
    ON public.project_highlights
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own project highlights"
    ON public.project_highlights
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.projects
            WHERE projects.id = project_highlights.project_id
              AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own project highlights"
    ON public.project_highlights
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.project_highlights TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.project_highlights TO service_role;

ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.project_highlights REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.project_highlights;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END;
$$;

COMMIT;
