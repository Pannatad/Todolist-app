-- Learning Tracker Feature - Supabase Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Learning Paths (Categories)
-- ============================================
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '📚',
    color TEXT DEFAULT 'purple',
    target_completion_date DATE,
    archived BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Learning Topics (Individual items)
-- ============================================
CREATE TABLE IF NOT EXISTS learning_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'mastered')) DEFAULT 'not_started',
    section TEXT CHECK (section IN ('current_focus', 'up_next', 'future', 'completed')) DEFAULT 'future',
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
    estimated_time INTEGER DEFAULT 0, -- in minutes
    actual_time INTEGER DEFAULT 0,    -- tracked time in minutes
    notes TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    mastered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Topic Resources (Links, notes, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS topic_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT DEFAULT '',
    resource_type TEXT CHECK (resource_type IN ('link', 'video', 'article', 'course', 'book', 'note')) DEFAULT 'link',
    notes TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Topic Time Logs (Study sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS topic_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_time_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Drop existing policies (re-runnable)
-- ============================================
DROP POLICY IF EXISTS "Users can view own learning_paths" ON learning_paths;
DROP POLICY IF EXISTS "Users can insert own learning_paths" ON learning_paths;
DROP POLICY IF EXISTS "Users can update own learning_paths" ON learning_paths;
DROP POLICY IF EXISTS "Users can delete own learning_paths" ON learning_paths;

DROP POLICY IF EXISTS "Users can view own learning_topics" ON learning_topics;
DROP POLICY IF EXISTS "Users can insert own learning_topics" ON learning_topics;
DROP POLICY IF EXISTS "Users can update own learning_topics" ON learning_topics;
DROP POLICY IF EXISTS "Users can delete own learning_topics" ON learning_topics;

DROP POLICY IF EXISTS "Users can view own topic_resources" ON topic_resources;
DROP POLICY IF EXISTS "Users can insert own topic_resources" ON topic_resources;
DROP POLICY IF EXISTS "Users can update own topic_resources" ON topic_resources;
DROP POLICY IF EXISTS "Users can delete own topic_resources" ON topic_resources;

DROP POLICY IF EXISTS "Users can view own topic_time_logs" ON topic_time_logs;
DROP POLICY IF EXISTS "Users can insert own topic_time_logs" ON topic_time_logs;
DROP POLICY IF EXISTS "Users can update own topic_time_logs" ON topic_time_logs;
DROP POLICY IF EXISTS "Users can delete own topic_time_logs" ON topic_time_logs;

-- ============================================
-- RLS Policies - learning_paths
-- ============================================
CREATE POLICY "Users can view own learning_paths" ON learning_paths
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learning_paths" ON learning_paths
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own learning_paths" ON learning_paths
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own learning_paths" ON learning_paths
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - learning_topics
-- ============================================
CREATE POLICY "Users can view own learning_topics" ON learning_topics
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learning_topics" ON learning_topics
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own learning_topics" ON learning_topics
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own learning_topics" ON learning_topics
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - topic_resources
-- ============================================
CREATE POLICY "Users can view own topic_resources" ON topic_resources
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topic_resources" ON topic_resources
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topic_resources" ON topic_resources
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own topic_resources" ON topic_resources
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - topic_time_logs
-- ============================================
CREATE POLICY "Users can view own topic_time_logs" ON topic_time_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own topic_time_logs" ON topic_time_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topic_time_logs" ON topic_time_logs
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own topic_time_logs" ON topic_time_logs
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_archived ON learning_paths(user_id, archived);
CREATE INDEX IF NOT EXISTS idx_learning_topics_path_id ON learning_topics(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_topics_user_id ON learning_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_topics_status ON learning_topics(learning_path_id, status);
CREATE INDEX IF NOT EXISTS idx_topic_resources_topic_id ON topic_resources(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_time_logs_topic_id ON topic_time_logs(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_time_logs_logged_at ON topic_time_logs(user_id, logged_at);
