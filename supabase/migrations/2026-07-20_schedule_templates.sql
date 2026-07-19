-- Saved day templates ("Standard workday", "Gym day", ...) the user or agent can
-- apply to any date. blocks is a JSON array of
-- { "title", "startTime" ("HH:MM"), "duration" (minutes), "category", "color" }.
CREATE TABLE IF NOT EXISTS public.schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_user_id ON public.schedule_templates(user_id);

ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_schedule_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_schedule_templates_updated_at ON public.schedule_templates;

CREATE TRIGGER update_schedule_templates_updated_at
    BEFORE UPDATE ON public.schedule_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_schedule_templates_updated_at();

DROP POLICY IF EXISTS "Users can view their own schedule templates" ON public.schedule_templates;
CREATE POLICY "Users can view their own schedule templates"
    ON public.schedule_templates
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own schedule templates" ON public.schedule_templates;
CREATE POLICY "Users can insert their own schedule templates"
    ON public.schedule_templates
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own schedule templates" ON public.schedule_templates;
CREATE POLICY "Users can update their own schedule templates"
    ON public.schedule_templates
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own schedule templates" ON public.schedule_templates;
CREATE POLICY "Users can delete their own schedule templates"
    ON public.schedule_templates
    FOR DELETE
    USING (auth.uid() = user_id);

GRANT ALL ON public.schedule_templates TO authenticated;
GRANT ALL ON public.schedule_templates TO service_role;
