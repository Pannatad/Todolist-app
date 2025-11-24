# Future AI Features

## 1. 🪄 The "Divide & Conquer" Wand (Task Breakdown)
**Problem:** "Write Research Paper" is too big, so users procrastinate.
**Solution:** A "Magic Wand" button on every task. Click it, and AI instantly explodes that task into 5 actionable sub-tasks (e.g., "Find 3 sources", "Write outline", "Draft intro") and adds them to your list.
**Why:** Directly attacks procrastination by making tasks approachable.
**Technical Note:** Use the existing `breakDownTask` function in `gemini.js`.

## 2. 📅 The "Daily Ritual" Architect (Smart Scheduler)
**Problem:** Users have 20 tasks and don't know *what* to do *today*.
**Solution:** A "Plan My Day" button. AI looks at your deadlines, difficulty levels, and energy, then builds a custom schedule for you (e.g., "9:00 AM: Deep Work (Math)", "11:00 AM: Quick Win (Email)").
**Why:** Eliminates decision fatigue.
**Technical Note:** Requires a new Gemini prompt that takes the entire task list and returns a schedule.
