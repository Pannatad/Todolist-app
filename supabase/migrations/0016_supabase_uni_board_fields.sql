-- Shared Tasks/Plan metadata for Uni-board V1.
-- Existing rows intentionally remain personal; this migration does not infer
-- university classification from old titles, subjects, or schedule kinds.

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS workspace TEXT NOT NULL DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS uni_kind TEXT,
    ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.schedule_items
    ADD COLUMN IF NOT EXISTS workspace TEXT NOT NULL DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS uni_kind TEXT,
    ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.tasks
    DROP CONSTRAINT IF EXISTS tasks_workspace_check,
    DROP CONSTRAINT IF EXISTS tasks_personal_uni_kind_check,
    DROP CONSTRAINT IF EXISTS tasks_university_uni_kind_check;

ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_workspace_check
        CHECK (workspace IN ('personal', 'university')),
    ADD CONSTRAINT tasks_personal_uni_kind_check
        CHECK (workspace <> 'personal' OR uni_kind IS NULL),
    ADD CONSTRAINT tasks_university_uni_kind_check
        CHECK (
            workspace <> 'university'
            OR (
                uni_kind IS NOT NULL
                AND uni_kind IN ('task', 'payment', 'registration', 'meeting', 'report', 'deadline')
            )
        );

ALTER TABLE public.schedule_items
    DROP CONSTRAINT IF EXISTS schedule_items_workspace_check,
    DROP CONSTRAINT IF EXISTS schedule_items_personal_uni_kind_check,
    DROP CONSTRAINT IF EXISTS schedule_items_university_uni_kind_check;

ALTER TABLE public.schedule_items
    ADD CONSTRAINT schedule_items_workspace_check
        CHECK (workspace IN ('personal', 'university')),
    ADD CONSTRAINT schedule_items_personal_uni_kind_check
        CHECK (workspace <> 'personal' OR uni_kind IS NULL),
    ADD CONSTRAINT schedule_items_university_uni_kind_check
        CHECK (
            workspace <> 'university'
            OR (
                uni_kind IS NOT NULL
                AND uni_kind IN ('exam', 'quiz', 'event')
            )
        );

CREATE INDEX IF NOT EXISTS idx_tasks_university_user_deadline
    ON public.tasks(user_id, deadline)
    WHERE workspace = 'university';

CREATE INDEX IF NOT EXISTS idx_schedule_items_university_user_start_time
    ON public.schedule_items(user_id, start_time)
    WHERE workspace = 'university';
