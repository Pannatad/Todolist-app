-- Seed habit migration
-- Run this in Supabase SQL Editor if your habits table already exists

ALTER TABLE habits
    ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS seed_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS seed_duration_days INTEGER DEFAULT 21,
    ADD COLUMN IF NOT EXISTS seed_why TEXT,
    ADD COLUMN IF NOT EXISTS seed_stage TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'habits_seed_duration_days_check'
    ) THEN
        ALTER TABLE habits
            ADD CONSTRAINT habits_seed_duration_days_check
            CHECK (seed_duration_days IS NULL OR seed_duration_days > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'habits_seed_stage_check'
    ) THEN
        ALTER TABLE habits
            ADD CONSTRAINT habits_seed_stage_check
            CHECK (seed_stage IS NULL OR seed_stage IN ('seed', 'sprout', 'rooted', 'blooming'));
    END IF;
END $$;

UPDATE habits
SET
    seed_started_at = COALESCE(seed_started_at, created_at),
    seed_duration_days = COALESCE(seed_duration_days, 21)
WHERE is_seed = true;
