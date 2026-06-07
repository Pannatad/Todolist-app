-- Focus Feature - Supabase Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL DEFAULT 'Focus',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 25),
    points_earned INTEGER NOT NULL CHECK (points_earned >= 1),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS focus_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost_points INTEGER NOT NULL CHECK (cost_points > 0),
    color TEXT NOT NULL DEFAULT 'mint',
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS focus_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points > 0),
    color TEXT NOT NULL DEFAULT 'mint',
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS focus_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES focus_rewards(id) ON DELETE SET NULL,
    reward_name TEXT NOT NULL,
    cost_points INTEGER NOT NULL CHECK (cost_points > 0),
    reward_color TEXT NOT NULL DEFAULT 'mint',
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS focus_point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('session', 'custom_action', 'purchase', 'milestone_bonus', 'use_reward')),
    points INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
    existing_constraint TEXT;
BEGIN
    SELECT conname INTO existing_constraint
    FROM pg_constraint
    WHERE conrelid = 'focus_point_transactions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%kind%';

    IF existing_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE focus_point_transactions DROP CONSTRAINT %I', existing_constraint);
    END IF;

    ALTER TABLE focus_point_transactions
        ADD CONSTRAINT focus_point_transactions_kind_check
        CHECK (kind IN ('session', 'custom_action', 'purchase', 'milestone_bonus', 'use_reward'));
END $$;

ALTER TABLE focus_inventory
    ADD COLUMN IF NOT EXISTS reward_color TEXT NOT NULL DEFAULT 'mint';

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can insert own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can update own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can delete own focus sessions" ON focus_sessions;

DROP POLICY IF EXISTS "Users can view own focus rewards" ON focus_rewards;
DROP POLICY IF EXISTS "Users can insert own focus rewards" ON focus_rewards;
DROP POLICY IF EXISTS "Users can update own focus rewards" ON focus_rewards;
DROP POLICY IF EXISTS "Users can delete own focus rewards" ON focus_rewards;

DROP POLICY IF EXISTS "Users can view own focus actions" ON focus_actions;
DROP POLICY IF EXISTS "Users can insert own focus actions" ON focus_actions;
DROP POLICY IF EXISTS "Users can update own focus actions" ON focus_actions;
DROP POLICY IF EXISTS "Users can delete own focus actions" ON focus_actions;

DROP POLICY IF EXISTS "Users can view own focus inventory" ON focus_inventory;
DROP POLICY IF EXISTS "Users can insert own focus inventory" ON focus_inventory;
DROP POLICY IF EXISTS "Users can update own focus inventory" ON focus_inventory;
DROP POLICY IF EXISTS "Users can delete own focus inventory" ON focus_inventory;

DROP POLICY IF EXISTS "Users can view own focus point transactions" ON focus_point_transactions;
DROP POLICY IF EXISTS "Users can insert own focus point transactions" ON focus_point_transactions;
DROP POLICY IF EXISTS "Users can update own focus point transactions" ON focus_point_transactions;
DROP POLICY IF EXISTS "Users can delete own focus point transactions" ON focus_point_transactions;

CREATE POLICY "Users can view own focus sessions" ON focus_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus sessions" ON focus_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus sessions" ON focus_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus sessions" ON focus_sessions
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own focus rewards" ON focus_rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus rewards" ON focus_rewards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus rewards" ON focus_rewards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus rewards" ON focus_rewards
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own focus actions" ON focus_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus actions" ON focus_actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus actions" ON focus_actions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus actions" ON focus_actions
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own focus inventory" ON focus_inventory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus inventory" ON focus_inventory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus inventory" ON focus_inventory
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus inventory" ON focus_inventory
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own focus point transactions" ON focus_point_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus point transactions" ON focus_point_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus point transactions" ON focus_point_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus point transactions" ON focus_point_transactions
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started_at ON focus_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_actions_user_created_at ON focus_actions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_focus_rewards_user_created_at ON focus_rewards(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_focus_inventory_user_purchased_at ON focus_inventory(user_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_inventory_user_used_at ON focus_inventory(user_id, used_at);
CREATE INDEX IF NOT EXISTS idx_focus_point_transactions_user_created_at ON focus_point_transactions(user_id, created_at DESC);

GRANT ALL ON focus_sessions TO authenticated;
GRANT ALL ON focus_actions TO authenticated;
GRANT ALL ON focus_rewards TO authenticated;
GRANT ALL ON focus_inventory TO authenticated;
GRANT ALL ON focus_point_transactions TO authenticated;
