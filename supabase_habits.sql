-- Habits Feature - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '✨',
    type TEXT CHECK (type IN ('check', 'count', 'duration')) DEFAULT 'check',
    target INTEGER DEFAULT 1,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'custom')) DEFAULT 'daily',
    schedule_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
    time_of_day TEXT DEFAULT 'anytime',
    color TEXT DEFAULT 'purple',
    reminder_time TIME,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create habit_logs table
CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    value INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(habit_id, date)
);

-- Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to make script re-runnable)
DROP POLICY IF EXISTS "Users can view own habits" ON habits;
DROP POLICY IF EXISTS "Users can insert own habits" ON habits;
DROP POLICY IF EXISTS "Users can update own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete own habits" ON habits;
DROP POLICY IF EXISTS "Users can view own habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Users can insert own habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Users can update own habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Users can delete own habit logs" ON habit_logs;

-- RLS Policies for habits
CREATE POLICY "Users can view own habits" ON habits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON habits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON habits
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for habit_logs
CREATE POLICY "Users can view own habit logs" ON habit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit logs" ON habit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habit logs" ON habit_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit logs" ON habit_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date);

-- Seed habit support
-- Safe to run on an existing habits table
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
