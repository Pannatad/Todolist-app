# Supabase Cloud Sync Setup

## Overview
All app features are now syncing with Supabase cloud storage! Below are the SQL scripts you need to run in your Supabase SQL Editor.

---

## 📋 Run These SQL Scripts in Order

### 1. Projects Table (NEW - Run This!)
Copy and paste this into Supabase SQL Editor:

```sql
-- Create projects table for Project Boards feature
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    is_ai_generated BOOLEAN DEFAULT true,
    columns JSONB NOT NULL DEFAULT '[]',
    tasks JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Create RLS Policies
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_projects_timestamp ON projects;

CREATE TRIGGER trigger_update_projects_timestamp
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- Grant necessary permissions
GRANT ALL ON projects TO authenticated;
GRANT ALL ON projects TO service_role;
```

---

## ✅ Already Synced Features

The following features are already configured to sync with Supabase (no action needed):

### 1. **Tasks & Schedule** 
- Table: `tasks`
- Table: `schedule_items`
- Syncs: All your tasks, deadlines, estimated times, and daily schedule

### 2. **Goals & Daily Highlights**
- Table: `goals`
- Table: `daily_highlights`
- Syncs: Vision board goals, daily highlight checkboxes

### 3. **Activity Logs**
- Table: `activity_logs`
- Syncs: Daily log activities with time tracking

### 4. **Game Progress**
- Table: `profiles`
- Syncs: Coins, unlocked plots, display mode (demon/penguin/minimal)

---

## 🔍 Verify Your Tables

Run this query in Supabase SQL Editor to check all your tables:

```sql
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- ✅ `activity_logs`
- ✅ `daily_highlights`
- ✅ `goals`
- ✅ `profiles`
- ✅ `projects` **(NEW)**
- ✅ `schedule_items`
- ✅ `tasks`

---

## 🔐 Row Level Security (RLS)

All tables have RLS enabled to ensure users can only access their own data:
- ✅ Users can only see/edit/delete their own projects
- ✅ All operations filtered by `user_id`
- ✅ Secure by default

---

## 📝 Data Structure Details

### Projects Table Schema
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References auth.users |
| `title` | TEXT | Project name |
| `description` | TEXT | Project description |
| `status` | TEXT | 'active', 'completed', 'archived' |
| `progress` | INTEGER | 0-100 completion percentage |
| `is_ai_generated` | BOOLEAN | true if created via AI, false if manual |
| `columns` | JSONB | Kanban columns (To Do, In Progress, Done) |
| `tasks` | JSONB | All project tasks with details |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated timestamp |

---

## 🎯 How It Works

### Guest Mode (Not Logged In)
- All data saved to localStorage
- Works offline
- Data stays on your device

### Logged In Mode
- All data automatically syncs to Supabase
- Access from any device
- Real-time cloud backup
- Seamless switching between devices

### Syncing Logic
1. When you log in → data loads from cloud
2. When you make changes → automatically saves to cloud
3. When you log out → switches back to localStorage

---

## 🚀 Next Steps

1. **Run the Projects SQL** (above)
2. **Log in** to your app
3. **Create a project** to test cloud sync
4. **Check Supabase dashboard** → Table Editor → `projects` to see your data!

---

## 🆘 Troubleshooting

If projects aren't syncing:

1. **Check RLS Policies**:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'projects';
```

2. **Check if table exists**:
```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'projects'
);
```

3. **View recent errors** in browser console (F12)

4. **Verify user authentication**:
```sql
SELECT id, email FROM auth.users;
```
