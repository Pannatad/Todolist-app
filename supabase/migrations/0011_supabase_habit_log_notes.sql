-- Habit log notes migration
-- Run this in Supabase SQL Editor if your habit_logs table already exists

ALTER TABLE habit_logs
    ADD COLUMN IF NOT EXISTS notes TEXT;
