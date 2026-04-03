-- Run this in your Supabase SQL Editor to add recurrence support to schedule_items

-- Add recurrence columns to existing schedule_items table
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'none';
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS recurrence_days_of_week INTEGER[];
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS recurrence_exceptions TEXT[] DEFAULT '{}';
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Optional: If you don't have a schedule_items table yet, create it
-- CREATE TABLE IF NOT EXISTS schedule_items (
--     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
--     title TEXT NOT NULL,
--     start_time TIMESTAMPTZ NOT NULL,
--     duration INTEGER DEFAULT 60,
--     category TEXT DEFAULT 'Other',
--     color TEXT DEFAULT '#6366f1',
--     notes TEXT,
--     recurrence_type TEXT DEFAULT 'none',
--     recurrence_interval INTEGER DEFAULT 1,
--     recurrence_days_of_week INTEGER[],
--     recurrence_end_date DATE,
--     recurrence_exceptions TEXT[] DEFAULT '{}',
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Enable RLS (if not already enabled)
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (if they don't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_items' AND policyname = 'Users can view own schedule') THEN
        CREATE POLICY "Users can view own schedule" ON schedule_items FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_items' AND policyname = 'Users can insert own schedule') THEN
        CREATE POLICY "Users can insert own schedule" ON schedule_items FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_items' AND policyname = 'Users can update own schedule') THEN
        CREATE POLICY "Users can update own schedule" ON schedule_items FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_items' AND policyname = 'Users can delete own schedule') THEN
        CREATE POLICY "Users can delete own schedule" ON schedule_items FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
