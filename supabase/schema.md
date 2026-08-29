# Schema map

| Table | Purpose | Used by |
| --- | --- | --- |
| `profiles` | Game economy and display preferences | `GameContext` |
| `user_profiles` | User profile and onboarding preferences | `UserProfileContext` |
| `goals` | Goal definitions, progress, and milestones | `GoalContext` |
| `daily_highlights` | Daily focus entries and completion state | `GoalContext` |
| `activity_logs` | User activity log entries | `LogContext` |
| `tasks` | Tasks, completion state, subtasks, and focus-session JSON | `TaskContext` |
| `schedule_items` | Scheduled events, recurrence, categories, and notes | `TaskContext` |
| `projects` | Project boards, phases, columns, and embedded project tasks | `ProjectContext` |
| `project_highlights` | Highlighted project tasks and subtasks | `ProjectContext` |
| `habits` | Habit definitions, schedules, and seed metadata | `HabitContext` |
| `habit_logs` | Per-day habit completion values and notes | `HabitContext` |
| `user_intelligence` | User facts, preferences, patterns, and reminders | `UserIntelligenceContext` |
| `learning_paths` | Learning-path metadata and progress | `LearningContext` |
| `learning_topics` | Topics belonging to learning paths | `LearningContext` |
| `topic_resources` | Resources attached to learning topics | `LearningContext` |
| `topic_time_logs` | Learning time entries | `LearningContext` |
| `idea_boards` | Per-user idea-board nodes | `IdeaBoardContext` |
| `uni_board_links` | Saved university portals and reference websites | `LinksContext` |
| `agent_memory_short` | Short-term agent memories | `AgentMemoryContext` |
| `agent_memory_long` | Long-term agent facts and summaries | `AgentMemoryContext` |
| `agent_conversations` | Saved chat conversations and messages | `ChatContext` |
| `focus_sessions` | Historical focus-session table; removed by the local-only drop migration | None |
| `focus_actions` | Historical focus action/points table; removed by the local-only drop migration | None |
| `focus_rewards` | Historical focus rewards table; removed by the local-only drop migration | None |
| `focus_inventory` | Historical focus inventory table; removed by the local-only drop migration | None |
| `focus_point_transactions` | Historical focus points ledger; removed by the local-only drop migration | None |
