-- Add category column to learning_paths table
-- Run this in your Supabase SQL Editor (optional — the app works without this via localStorage)

ALTER TABLE learning_paths ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
