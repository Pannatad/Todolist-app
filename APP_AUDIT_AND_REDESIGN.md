# App Audit & Redesign Plan
**All-in-One Personal Assistant — full codebase review**
*Date: 2026-07-07 · Reviewed copy: `~/Vibe-coded-app/Todolist-app` (the one you run)*

---

## 1. Executive Summary

Your instinct is correct: the app is a stack of ~8 partially-finished products sharing one shell. The codebase is **~37,000 lines** (25.7k components + 6.6k contexts + 4.1k services), touching **26 Supabase tables**, with **at least 4 competing design languages**, **3 separate gamification economies**, **4 different AI surfaces**, and **~2,500 lines of dead or unreachable code**.

None of this is fatal — the bones are good (React 19, Vite, lazy-loaded tabs, context-per-domain, a working AI proxy). The problem is *breadth without depth*: every feature is at 60%, and each one shipped with its own visual style and its own reward system.

**The fix is not more features. It is: pick a core, cut the rest, and unify the UI under one design system (the iOS-like language already prototyped in Projects).**

Recommended end state: **5 tabs** (Today · Plan · Tasks · Habits · Projects), **1 AI surface**, **1 (or zero) reward system**, **1 design language**, and roughly **half the current code**.

---

## 2. Current State Inventory

### 2.1 The numbers

| Layer | Lines | Notes |
|---|---|---|
| Components (44 files) | 25,737 | `Overview.jsx` alone is **3,117 lines** |
| Contexts (15 providers) | 6,617 | Every provider duplicates guest-localStorage + Supabase paths |
| Services (14 files) | 4,140 | `gemini.js` is 1,073 lines with 56 `console.log`s |
| Supabase tables referenced | 26 | Schema spread across **11 loose `supabase_*.sql` files** + `supabase/migrations/` |
| `alert()` calls | 27 | No unified toast/error UI |
| Visible tabs | 8 | Plus **2 unreachable tabs** (Vision, Sleep) still wired in `App.jsx` |

### 2.2 Tab-by-tab audit

| Tab | Component(s) | State | Verdict |
|---|---|---|---|
| **Overview** | `Overview.jsx` (3,117) + MagicBox + DailyRitualModal + 11 toggleable widgets + proactive suggestions + post-it | Feature-rich but bloated; the single biggest file; mixes agent logic, widget rendering, and scheduling in one file | **Keep as core — but rebuild as "Today"** with 4–5 fixed, opinionated sections instead of 11 optional widgets |
| **Schedule** | `Calendar.jsx` (282) → wraps `Schedule.jsx` (714) → plus `WeeklyPlan`, `TimetableEditor`, `WeeklyGrid`, `TimetableSummary` (~1,665 more) | Three nested layers; timetable subsystem is a separate half-product; events have a `category` field but **no UI to set it** | **Keep — flatten to one component**, add category picker, merge timetable into recurring events |
| **Tasks ("Garden")** | `Garden.jsx` (1,359) + `Plant.jsx` (663, dead) + `SeedGarden`/`SeedVisualization`/`SeedProgressList` | The plant/seed metaphor is mostly vestigial; what remains is actually a decent task list with chunks (subtasks) buried under garden theming and coins | **Keep the task list, kill the garden metaphor** |
| **Habits** | `HabitTracker.jsx` + `TodayHabits` + `HabitCard`/`HabitModal`/`HabitNotesModal` (~2,200 total) | Functional (today + weekly views) but styled as a neo-brutalist "sticker desk" — rotated badges, thick ink borders, dot-grid paper. Completely different world from the rest of the app | **Keep functionality, restyle entirely** |
| **Focus** | `Focus.jsx` (1,128) + `FocusContext` (936) | A *fourth* product: session logging, a points economy (`focus_point_transactions`, `focus_rewards`, `focus_inventory`, `focus_actions` — 4 tables), milestone chests, punch cards. It's a manual log, not an actual timer | **Cut as a tab.** Fold a simple focus timer into Tasks; drop the points/rewards shop |
| **Ideas** | `IdeasBoard.jsx` (749) + `IdeaBoardContext` | A tree/mind-map note tool; overlaps heavily with Projects' mind map (`ProjectMindMap.jsx`, 734) | **Merge into Projects** (an "Ideas" inbox that can graduate into a project) or cut |
| **Learning** | `LearningTracker` (863) + `LearningPathDetailView` (836) + `TopicModal` (623) + `AITopicGenerator` (473) + `LearningContext` (956) + YouTube service (321) | The second-biggest sub-product (~4,500 lines). Paths, topics, resources, time logs, AI generation, YouTube integration. Genuinely featureful but it's an entire app of its own | **Decide**: if you actually use it, keep as a tab but restyle; if not, archive the code and drop it. Do not keep "just in case" |
| **Projects** | `ProjectBoards.jsx` (836) + `ProjectDetailView` (703) + `ProjectMindMap` (734) + `ProjectCalendar` (242) | **The best-designed tab** — the `ios-codex` style (clean cards, thin borders, timeline rails, muted slate palette) is exactly the direction you said you want | **Keep — this is the design template for everything else** |
| **Vision** (hidden) | `VisionBoard` (320) + `GoalCard` + `GoalModal` | Rendered for `activeTab === 'vision'` — **no tab button exists; unreachable** | **Delete** (or fold "goals" into Today's ritual) |
| **Sleep** (hidden) | `SleepTrendsDashboard` (274) | Same — unreachable; `sleepData: []` is hardcoded empty in Overview | **Delete** |

### 2.3 Dead & orphaned code (safe deletions)

**Unreachable features** (wired but no way to navigate to them):
- `VisionBoard.jsx`, `GoalCard.jsx`, `GoalModal.jsx` (~610 lines) — `vision` tab not in nav
- `SleepTrendsDashboard.jsx` (274) — `sleep` tab not in nav

**Truly unused components** (imported by nothing):
- `DailyLog.jsx` (916) · `Plant.jsx` (663) · `TaskCalendar.jsx` (227) · `Analytics.jsx` (158) · `TopicCard.jsx` (102) · `PersonaAvatar.jsx` (93) · `KanbanColumn.jsx` (56)

**Repo junk:**
- `DemonToDoList.zip` (27 KB zip committed to git), `test_yt.js`, `test_yt.mjs`, `yt_out.txt`
- 11 loose `supabase_*.sql` files at root + `update_tasks_schema.sql` + `supabase_projects_tab_reset.sql` — should all live in `supabase/migrations/`

**Vestigial systems:**
- The Demon/Penguin/Minimal persona system: `Penguin.jsx` (206), `PersonaAvatar` (dead), `displayMode` hardcoded to `'minimal'` in GameContext, persona prompts still in `gemini.js`
- Garden coins & plots (`growth-coins`, `growth-plots`) — a currency you earn but can barely spend

> **Total safe deletion: ~4,000–4,500 lines** before touching anything you actually use.

### 2.4 Architectural issues

1. **`Overview.jsx` is a god-file (3,117 lines).** It contains the widget picker, post-it, current-event logic, quick-add popups, agent command routing, proactive suggestions, and the daily-ritual trigger. Anything you touch risks something else.
2. **Dual persistence everywhere.** Every context implements two code paths (guest localStorage + Supabase) inline — ~25 localStorage keys, inconsistent naming (`growth-*`, `demon-projects`, `habits-guest`). This doubles the surface for bugs. It should be one repository interface per entity with two backends.
3. **Four AI surfaces**: MagicBox agent bar (Overview), floating ChatSidebar (global), AIHelpSidebar (Tasks), plus embedded AI in Learning/Projects/Schedule. They have separate prompt builders, separate histories (`chat_messages`, `agent_memory_*`, `agent_conversations`), and separate confirmation flows.
4. **Three gamification economies**: garden coins/plots, focus points/rewards/inventory/milestones, habit streaks/stamps. None is finished; each has its own tables and UI.
5. **Schema drift.** 26 tables, loose SQL files, and tables like `user_profiles` vs `profiles` both referenced. There's no single source of truth for the schema.
6. **Error handling is `alert()` + `console.log`.** 27 alerts, hundreds of logs (56 in gemini.js alone). One stuck `alert()` literally froze the page during my testing.
7. **Four-way theme cycler** (cozy/professional/pink/blue) multiplies every styling decision by four; combined with dark mode that's 8 variants — and most components only honor one or two.

---

## 3. Product Direction: "A Calm Secretary"

Everything you've asked for lately (schedule briefing, categorized blocks, day summary under the agent bar) points to one identity:

> **A personal secretary: it knows your day, tells you what matters now, and takes dictation.**

Judge every feature against that. A secretary needs: today's brief, the calendar, the task list, routine tracking, and project folders. A secretary does not need: a coin economy, a plant nursery, a rewards shop, three chat windows, or a sticker desk.

### 3.1 Proposed structure — 5 tabs

| New tab | What it absorbs | What it drops |
|---|---|---|
| **Today** | Overview: greeting, *Now/Next* spotlight, agent bar, day briefing (blocks by category), habits due, priority tasks | 11-widget picker (fix the layout, make it opinionated), post-it (or keep as one small card), proactive suggestion cards (fold into the agent) |
| **Plan** | Schedule + Calendar + timetable (as "recurring blocks") | The 3-layer component nesting; separate timetable editor |
| **Tasks** | Garden's task list + chunks + a real focus timer (start from a task, count down, log automatically) | Garden/seed/plant theming, coins, plots, Focus tab's manual session logger + points shop |
| **Habits** | Habit tracker (today + weekly) | Sticker-desk styling; sleep dashboard (unless you re-add sleep logging deliberately) |
| **Projects** | Project boards + detail + mind map + **Ideas** (as an inbox column: idea → project) | Separate Ideas tab; Learning tab *(if you keep Learning, it becomes the 6th tab — make an honest keep/kill call)* |

### 3.2 One AI surface

Keep **one** conversational entry point: the MagicBox bar on Today, expanding into the chat sidebar for history (same brain, same memory, same confirmation modal). Remove AIHelpSidebar; keep contextual AI *buttons* (e.g. "break down this task", "generate project plan") that route through the same agent.

### 3.3 Gamification: keep only streaks

Minimal iOS-like apps earn delight through *polish*, not currencies. Keep: habit streaks and a subtle daily completion ring on Today. Cut: coins, plots, focus points, rewards shop, inventory, milestone chests. (This deletes 4 tables and ~2,000 lines and nothing of daily value is lost.)

---

## 4. UI Redesign: One iOS-like Design System

The `ios-codex` style in Projects is the right foundation. Codify it as tokens and apply app-wide.

### 4.1 Design tokens

```
Typography  SF-style stack: -apple-system, "SF Pro Text", Inter, system-ui
            Sizes: 28/22/17/15/13 (large title / title / body / secondary / caption)
            Weights: 700 for titles, 600 for labels, 400 body. No font-black outside large titles.

Color       Background:  #F7F7F8 (light) / #0B0B0D (dark)
            Card:        #FFFFFF / #161618
            Border:      1px  #E5E5EA / rgba(255,255,255,0.08)
            Text:        #111 / #F2F2F7;  secondary #6B7280 / #98989E
            Accent:      ONE color (indigo #5B5BD6 or iOS blue #0A84FF) for actions only
            Semantic:    red = overdue/delete, green = done, amber = due today
            Category colors: keep the existing hash palette, but only as small dots/chips

Shape       Cards rounded-2xl (16px); controls rounded-xl (12px); full-width list rows with
            inset separators (like iOS Settings). Shadows: shadow-sm max. No blur orbs,
            no gradient blobs, no rotated decorations, no dot-grid paper.

Motion      150–250ms ease-out only: fade+2px rise on mount, spring on sheet presentation.
            Remove decorative Framer Motion (staggered bouncing, pulsing dots).
```

### 4.2 Component patterns (build once, reuse everywhere)

1. **`<Card>`** — white, 1px border, rounded-2xl, p-4/5. Every panel uses it.
2. **`<ListRow>`** — icon · title/subtitle · trailing value/chevron. Tasks, habits, events, projects all render as list rows. This alone will unify 70% of the app.
3. **`<Sheet>`** — one modal component (bottom sheet on mobile, centered on desktop) replacing today's ~10 hand-rolled modals with different paddings/rounds.
4. **`<Chip>`** — the category chip from the new briefing (dot + label + count) as the single tag style.
5. **`<Toast>`** — replace all 27 `alert()` calls. Non-blocking, top corner, auto-dismiss.
6. **`<SegmentedControl>`** — iOS-style segmented picker for view switches (Today/Weekly, List/Board/Calendar), replacing the various pill-button rows.

### 4.3 Themes

Kill the 4-theme cycler. Ship **light + dark only**, driven by the token set. (If you love the pink/blue accents, make *accent color* the only user choice — one variable, not four palettes.)

### 4.4 Navigation

Keep top tab bar on desktop but style it as an iOS segmented/sidebar hybrid: monochrome inactive icons, accent-tinted active pill, no per-tab colors. On narrow screens it becomes a bottom tab bar (5 items — another reason to cut to 5 tabs).

---

## 5. Execution Plan

### Phase 0 — Decisions (you, 30 minutes)
- [ ] Confirm the 5-tab structure (biggest call: **keep or archive Learning**; merge Ideas into Projects?)
- [ ] Confirm cutting coins/points/rewards in favor of streaks only
- [ ] Pick the one accent color

### Phase 1 — Chainsaw week (low risk, huge clarity win)
- [ ] Delete unreachable/unused: Vision, Sleep, DailyLog, Plant, TaskCalendar, Analytics, TopicCard, PersonaAvatar, KanbanColumn, Penguin, test_yt.*, yt_out.txt, DemonToDoList.zip (~4,500 lines)
- [ ] Move all loose `*.sql` into `supabase/migrations/` with ordered names; write one `schema.sql` snapshot
- [ ] Strip `console.log`s (keep `console.error`); add a tiny `log()` util gated on `import.meta.env.DEV`
- [ ] Add `<Toast>` and replace all `alert()` calls
- [ ] Remove persona remnants (Demon/Penguin prompts, displayMode)

### Phase 2 — Design system (1–2 weeks)
- [ ] Create `src/ui/` with Card, ListRow, Sheet, Chip, Toast, SegmentedControl + tokens in `index.css`
- [ ] Remove cozy/professional/pink/blue; wire light/dark to tokens
- [ ] Restyle the app shell (header, tab bar) with the new tokens

### Phase 3 — Tab consolidation (do in this order)
1. **Today**: split `Overview.jsx` into `today/` folder (Spotlight, AgentBar, Briefing, HabitsCard, TasksCard ≤ 300 lines each); fixed layout, delete widget picker
2. **Tasks**: strip garden theming from `Garden.jsx`; add focus timer (start-from-task, countdown, auto-log); delete Focus tab + FocusContext + 4 focus tables
3. **Plan**: flatten Calendar→Schedule into one `Plan.jsx`; add the missing **category picker** to the event modal (your briefing chips finally light up); convert timetable to "recurring blocks"
4. **Habits**: restyle with ListRow/Card (logic unchanged)
5. **Projects**: absorb Ideas as an inbox; polish (it's already the reference)

### Phase 4 — Foundations (parallel/ongoing)
- [ ] Repository layer: `src/data/<entity>.js` exposing CRUD; localStorage + Supabase as interchangeable backends; contexts consume repositories (kills the dual-path duplication)
- [ ] Unify agent memory into one conversation store; delete redundant memory services
- [ ] Error boundaries per tab; loading skeletons instead of "Loading..."
- [ ] A handful of tests around `scheduleOccurrences`, task state, and the agent's local handler (the pure logic)

### Success criteria
- ≤ 20,000 total lines (from ~37,000)
- No file > 500 lines
- 5 tabs, 1 modal system, 1 AI surface, 0 `alert()`
- Every screen recognizably the same app

---

## 6. Quick Wins (worth doing even if you ignore everything else)

1. Delete the dead files (§2.3) — one commit, zero risk.
2. Add the **category picker** to `ScheduleEventModal` — the secretary briefing you just built is starved for data without it.
3. Replace `alert()` with toasts — a stuck alert can freeze the whole app (observed during testing).
4. Consolidate the SQL files into `supabase/migrations/`.
5. Split `Overview.jsx` — before it grows past 3,200 lines.

---

*Generated by Claude Code · based on full static review of `src/` (44 components, 15 contexts, 14 services), `App.jsx` routing, `index.css`, `vite.config.js`, and Supabase schema references.*
