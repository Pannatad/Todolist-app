CREATE TABLE IF NOT EXISTS public.idea_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT idea_boards_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_boards_user_id ON public.idea_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_boards_updated_at ON public.idea_boards(updated_at DESC);

ALTER TABLE public.idea_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_boards REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.update_idea_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_idea_boards_updated_at ON public.idea_boards;

CREATE TRIGGER update_idea_boards_updated_at
    BEFORE UPDATE ON public.idea_boards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_idea_boards_updated_at();

DROP POLICY IF EXISTS "Users can view their own idea boards" ON public.idea_boards;
CREATE POLICY "Users can view their own idea boards"
    ON public.idea_boards
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own idea boards" ON public.idea_boards;
CREATE POLICY "Users can insert their own idea boards"
    ON public.idea_boards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own idea boards" ON public.idea_boards;
CREATE POLICY "Users can update their own idea boards"
    ON public.idea_boards
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own idea boards" ON public.idea_boards;
CREATE POLICY "Users can delete their own idea boards"
    ON public.idea_boards
    FOR DELETE
    USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_boards;

GRANT ALL ON public.idea_boards TO authenticated;
GRANT ALL ON public.idea_boards TO service_role;
