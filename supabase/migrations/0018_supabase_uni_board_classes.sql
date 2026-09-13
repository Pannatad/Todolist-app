-- Classes are independent of timetable sessions; checklist entries remain tasks.
-- Safe to rerun after a completed or partially applied migration.
BEGIN;
CREATE TABLE IF NOT EXISTS public.uni_board_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  name_key TEXT NOT NULL CHECK (name_key = lower(btrim(name))),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name_key),
  UNIQUE (user_id, id)
);
CREATE TABLE IF NOT EXISTS public.uni_board_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  body TEXT NOT NULL DEFAULT '',
  url TEXT CHECK (url IS NULL OR url ~* '^https?://'),
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, class_id) REFERENCES public.uni_board_classes(user_id, id) ON DELETE CASCADE
);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS class_id UUID,
  ADD COLUMN IF NOT EXISTS class_item_kind TEXT;
ALTER TABLE public.schedule_items ADD COLUMN IF NOT EXISTS class_id UUID;
DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_class_owner_fk') THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_class_owner_fk
      FOREIGN KEY (user_id, class_id) REFERENCES public.uni_board_classes(user_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.schedule_items'::regclass AND conname = 'schedule_class_owner_fk') THEN
    ALTER TABLE public.schedule_items ADD CONSTRAINT schedule_class_owner_fk
      FOREIGN KEY (user_id, class_id) REFERENCES public.uni_board_classes(user_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_class_metadata_check') THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_class_metadata_check CHECK (
      (class_id IS NULL AND class_item_kind IS NULL) OR
      (workspace = 'university' AND class_id IS NOT NULL AND class_item_kind IS NOT NULL
       AND class_item_kind IN ('homework', 'revision', 'reminder'))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.schedule_items'::regclass AND conname = 'schedule_class_workspace_check') THEN
    ALTER TABLE public.schedule_items ADD CONSTRAINT schedule_class_workspace_check
      CHECK (class_id IS NULL OR workspace = 'university');
  END IF;
END;
$migration$;
CREATE INDEX IF NOT EXISTS tasks_class_idx ON public.tasks(user_id, class_id);
CREATE INDEX IF NOT EXISTS schedule_class_idx ON public.schedule_items(user_id, class_id);
CREATE INDEX IF NOT EXISTS announcements_class_idx ON public.uni_board_announcements(user_id, class_id);
ALTER TABLE public.uni_board_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uni_board_announcements ENABLE ROW LEVEL SECURITY;
DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.uni_board_classes'::regclass AND polname = 'classes_owner') THEN
    CREATE POLICY classes_owner ON public.uni_board_classes FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.uni_board_announcements'::regclass AND polname = 'announcements_owner') THEN
    CREATE POLICY announcements_owner ON public.uni_board_announcements FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$migration$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uni_board_classes, public.uni_board_announcements TO authenticated;
GRANT ALL ON public.uni_board_classes, public.uni_board_announcements TO service_role;

-- Preserve the timetable's existing category grouping. No task classification is inferred.
INSERT INTO public.uni_board_classes (user_id, name, name_key)
SELECT DISTINCT ON (user_id, lower(coalesce(nullif(btrim(category), ''), 'University')))
  user_id, coalesce(nullif(btrim(category), ''), 'University'),
  lower(coalesce(nullif(btrim(category), ''), 'University'))
FROM public.schedule_items WHERE workspace = 'university'
ON CONFLICT (user_id, name_key) DO NOTHING;
UPDATE public.schedule_items s SET class_id = c.id
FROM public.uni_board_classes c
WHERE s.workspace = 'university' AND s.class_id IS NULL AND s.user_id = c.user_id
  AND lower(coalesce(nullif(btrim(s.category), ''), 'University')) = c.name_key;

COMMIT;
