CREATE TABLE IF NOT EXISTS public.uni_board_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_uni_board_links_user_id ON public.uni_board_links(user_id);
CREATE INDEX IF NOT EXISTS idx_uni_board_links_created_at ON public.uni_board_links(created_at DESC);

ALTER TABLE public.uni_board_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uni_board_links REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.update_uni_board_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_uni_board_links_updated_at ON public.uni_board_links;

CREATE TRIGGER update_uni_board_links_updated_at
    BEFORE UPDATE ON public.uni_board_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_uni_board_links_updated_at();

DROP POLICY IF EXISTS "Users can view their own Uni-board links" ON public.uni_board_links;
CREATE POLICY "Users can view their own Uni-board links"
    ON public.uni_board_links FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own Uni-board links" ON public.uni_board_links;
CREATE POLICY "Users can insert their own Uni-board links"
    ON public.uni_board_links FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own Uni-board links" ON public.uni_board_links;
CREATE POLICY "Users can update their own Uni-board links"
    ON public.uni_board_links FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own Uni-board links" ON public.uni_board_links;
CREATE POLICY "Users can delete their own Uni-board links"
    ON public.uni_board_links FOR DELETE
    USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.uni_board_links;

GRANT ALL ON public.uni_board_links TO authenticated;
GRANT ALL ON public.uni_board_links TO service_role;
