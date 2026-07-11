ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS focus_sessions JSONB NOT NULL DEFAULT '[]'::jsonb;

DROP TABLE IF EXISTS focus_point_transactions, focus_rewards, focus_inventory, focus_actions, focus_sessions;
