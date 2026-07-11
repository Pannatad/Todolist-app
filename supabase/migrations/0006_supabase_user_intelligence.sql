-- User Intelligence Table for Agent Personalization
-- Stores learned facts, preferences, and patterns about users

CREATE TABLE IF NOT EXISTS user_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('fact', 'preference', 'pattern', 'reminder')),
    content TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'explicit' CHECK (source IN ('explicit', 'inferred')),
    confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_intelligence_user_id ON user_intelligence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_intelligence_category ON user_intelligence(category);
CREATE INDEX IF NOT EXISTS idx_user_intelligence_source ON user_intelligence(source);

-- Enable Row Level Security
ALTER TABLE user_intelligence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own intelligence" ON user_intelligence;
DROP POLICY IF EXISTS "Users can insert their own intelligence" ON user_intelligence;
DROP POLICY IF EXISTS "Users can update their own intelligence" ON user_intelligence;
DROP POLICY IF EXISTS "Users can delete their own intelligence" ON user_intelligence;

CREATE POLICY "Users can view their own intelligence"
    ON user_intelligence FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own intelligence"
    ON user_intelligence FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intelligence"
    ON user_intelligence FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own intelligence"
    ON user_intelligence FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_user_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_intelligence_timestamp ON user_intelligence;

CREATE TRIGGER trigger_update_user_intelligence_timestamp
    BEFORE UPDATE ON user_intelligence
    FOR EACH ROW
    EXECUTE FUNCTION update_user_intelligence_updated_at();

-- Grant permissions
GRANT ALL ON user_intelligence TO authenticated;
GRANT ALL ON user_intelligence TO service_role;
