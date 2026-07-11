-- Learning Tracker Enhancements - Migration Script
-- Run this in your Supabase SQL Editor AFTER the original schema

-- ============================================
-- 1. Add timetable (JSONB) to learning_paths
-- ============================================
ALTER TABLE learning_paths
ADD COLUMN IF NOT EXISTS timetable JSONB DEFAULT '[]'::JSONB;
-- Format: [{"day": 1, "start": "09:00", "end": "10:30"}, ...]
-- day: 0=Sunday, 1=Monday ... 6=Saturday

ALTER TABLE learning_paths
ADD COLUMN IF NOT EXISTS sequential_lock BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. Add exercise/revision fields to learning_topics
-- ============================================
ALTER TABLE learning_topics
ADD COLUMN IF NOT EXISTS exercise_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS revision_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prerequisite_topic_ids UUID[] DEFAULT '{}';

-- ============================================
-- 3. Add 'file' to topic_resources resource_type
-- ============================================
-- Drop the existing constraint and recreate with 'file' added
ALTER TABLE topic_resources DROP CONSTRAINT IF EXISTS topic_resources_resource_type_check;
ALTER TABLE topic_resources ADD CONSTRAINT topic_resources_resource_type_check
    CHECK (resource_type IN ('link', 'video', 'article', 'course', 'book', 'note', 'file'));

-- Add file metadata columns to topic_resources
ALTER TABLE topic_resources
ADD COLUMN IF NOT EXISTS file_path TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT '';

-- ============================================
-- 4. Create Supabase Storage bucket for materials
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('learning-materials', 'learning-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Users can upload own materials" ON storage.objects;
CREATE POLICY "Users can upload own materials" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'learning-materials' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view own materials" ON storage.objects;
CREATE POLICY "Users can view own materials" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'learning-materials' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own materials" ON storage.objects;
CREATE POLICY "Users can delete own materials" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'learning-materials' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );
