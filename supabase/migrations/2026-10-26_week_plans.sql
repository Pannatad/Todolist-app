-- Week plans: one row per user per week (week_start is that week's Monday).
-- targets is a JSON array of { "id", "label", "minutes" } daily time targets;
-- key_tasks is a JSON array of { "id", "title", "done" }.
CREATE TABLE IF NOT EXISTS public.week_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    theme TEXT NOT NULL DEFAULT '',
    build_habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
    break_habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
    targets JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE (user_id, week_start)
);

ALTER TABLE public.week_plans ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_week_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_week_plans_updated_at ON public.week_plans;
CREATE TRIGGER update_week_plans_updated_at
    BEFORE UPDATE ON public.week_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_week_plans_updated_at();

DROP POLICY IF EXISTS "Users can view their own week plans" ON public.week_plans;
CREATE POLICY "Users can view their own week plans"
    ON public.week_plans FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own week plans" ON public.week_plans;
CREATE POLICY "Users can insert their own week plans"
    ON public.week_plans FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own week plans" ON public.week_plans;
CREATE POLICY "Users can update their own week plans"
    ON public.week_plans FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own week plans" ON public.week_plans;
CREATE POLICY "Users can delete their own week plans"
    ON public.week_plans FOR DELETE
    USING ((select auth.uid()) = user_id);

GRANT ALL ON public.week_plans TO authenticated;
GRANT ALL ON public.week_plans TO service_role;

-- "Avoid" habits track a habit you are breaking: done means a clean day.
ALTER TABLE public.habits DROP CONSTRAINT IF EXISTS habits_type_check;
ALTER TABLE public.habits
    ADD CONSTRAINT habits_type_check
    CHECK (type IN ('check', 'count', 'duration', 'score', 'time', 'avoid'));
