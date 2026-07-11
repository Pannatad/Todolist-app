# Implementation Spec — iOS-like Redesign, Phase-by-Phase Work Orders
*Companion to `APP_AUDIT_AND_REDESIGN.md`. That doc is the strategy; this doc is the exact to-do list.*
*Baseline: current working tree of `~/Vibe-coded-app/Todolist-app` (includes the partial redesign already applied — see §1). Date: 2026-07-10.*

---

## 0. Rules for the implementing agent

1. **One work order (WO) = one commit.** Never combine. Commit message = WO id + title.
2. **After every WO:** run `npx vite build` (must pass) and `npx eslint <touched files>` (must pass), then load the app and click through the affected tab. If the WO has an "Acceptance" list, verify every item.
3. **Do not invent features, copy, colors, or components.** All styling comes from the existing tokens in `tokens.css` and the primitives in `src/ui/`. If something seems missing, stop and leave a `SPEC-QUESTION:` comment rather than improvising.
4. **Do not touch these unless a WO names them:** `src/services/*`, `src/context/*` (except where specified), `vite.config.js`, anything under `supabase/`.
5. **Copy tone:** Apple-terse. Section titles are 1–2 words ("Today", "Schedule", "Habits"). Empty states are one short sentence ("No tasks today."). No metaphors, no exclamation marks, no "little/cozy/gentle" language.
6. Guest mode (no login) must keep working after every WO — most data lives in localStorage.

---

## 1. Current baseline — what already exists (do not redo)

A previous agent already implemented, and these are KEPT:

| Asset | Location | Status |
|---|---|---|
| Design tokens (oklch, light+dark, SF font stack) | `tokens.css` (repo root, imported by `src/main.jsx`) | ✅ working |
| UI primitives: `Card`, `ListRow`, `Chip`, `Sheet`, `SegmentedControl`, `ToastProvider`/`useToast` | `src/ui/` (styles in `src/ui/ui.css`) | ✅ exist; Toast **not yet used anywhere** |
| 5-tab nav: Today / Plan / Tasks / Habits / Projects + light/dark toggle | `src/App.jsx` (tabs array ~line 130) | ✅ working |
| Legacy-tab redirect map `{ focus:'tasks', ideas:'projects', learning:'projects' }` | `src/App.jsx` ~line 42 | ⚠️ hides features without merging them (see WO-03/08) |
| App shell styles | `src/app-shell.css` | ✅ working |
| Projects tab restyle | `ProjectBoards.jsx`, `ProjectDetailView.jsx` | ✅ acceptable, minor polish later |
| Habits tab partial restyle | `HabitTracker.jsx`, `TodayHabits.jsx`, `WeeklyGrid.jsx` | ⚠️ leftovers (WO-05) |

Known defects of the baseline (each has a WO): Overview below-the-fold still renders the old widget-grid dashboard that clashes with the new shell (WO-02); Learning/Ideas/Focus features stranded (WO-03, WO-08); wordy copy on Tasks (WO-04); Habits style leftovers (WO-05); 27 `alert()` calls (WO-07); dead files still present (WO-06).

Primitive APIs (use exactly these props):

```jsx
import { Card, ListRow, Chip, Sheet, SegmentedControl, useToast } from '../ui';

<Card className="">…</Card>                                   // renders <section class="ui-card">
<ListRow icon={IconComponent} title="" subtitle="" trailing={<node/>} />
useToast()                                                     // inside components under <ToastProvider>
```

---

## 2. Decision required from the owner (BLOCKING for WO-03 only)

> **Learning tab: keep or archive?** It is ~4,500 lines (LearningTracker, LearningPathDetailView, TopicModal, AITopicGenerator, LearningContext, youtubeService) and currently unreachable.
> - **KEEP** → do WO-03 option A (6th tab).
> - **ARCHIVE** → do WO-03 option B (delete files).
> Everything else in this spec proceeds regardless.

---

## 3. Work orders

### WO-01 — Safety snapshot
Create a branch and commit the current working tree so nothing can be lost.
```bash
git checkout -b redesign/ios-minimal
git add -A && git commit -m "WO-01: snapshot of partial redesign baseline"
```
**Acceptance:** `git status` clean; branch `redesign/ios-minimal` active.

---

### WO-02 — Today tab: remove the legacy widget dashboard
**File:** `src/components/Overview.jsx` (3,017 lines)

The page currently renders (top → bottom): header/spotlight/MagicBox/Today-briefing **(KEEP, already correct)** followed by a legacy "Main Content Grid" of 10 toggleable widgets **(REMOVE)**.

Steps:
1. Delete the entire legacy grid: everything from the comment `{/* Main Content Grid */}` (`<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">`, ~line 2040) down to its closing `</div>` just before the modals (`<ScheduleEventModal`). Use JSX bracket matching, not line numbers.
2. Delete now-dead code in the same file:
   - `OVERVIEW_WIDGETS` array, `OverviewWidgetPicker` component, `isWidgetVisible`, `visibleWidgetIds` state + its two `useEffect`s + `handleToggleWidget`/`handleResetWidgets`, the Settings gear button that opens the picker, and storage keys `OVERVIEW_WIDGET_STORAGE_KEY` / `OVERVIEW_USEFUL_WIDGETS_MIGRATION_KEY` / `USEFUL_OVERVIEW_WIDGET_IDS`.
   - `CurrentEventWidget`, `PostItWidget` + `POST_IT_THEMES` + their storage keys.
   - `import Penguin from './Penguin';` and any `<Penguin`/`Motion`-decoration usages that die with the grid.
   - Any variables ESLint then flags as unused (`timeGaps`, `recentNotes`, `ideaSpotlight` computations, `pinnedLearningPaths` block, etc.). Remove them until ESLint is clean — **do not** remove `scheduleBriefing`, `scheduleSpotlight`, `todaySummary`, `commandCenterScheduleItems`.
3. Under the existing Today briefing section, add exactly three cards (this is the whole below-the-fold now), using data already computed in the file:
   ```jsx
   {/* Habits due today */}
   <Card>
     <h2>Habits</h2>  {/* + "n of m done" secondary text from todayHabitWidgetItems/completedHabitWidgetCount */}
     {/* one ListRow per habit: icon=habit icon or Repeat2, title=habit.name,
         trailing = done ? <Check/> : a small "Done" button calling markHabitForToday(habit, true) */}
   </Card>
   {/* Priority tasks (top 5 by getTaskUrgencyMeta: Overdue, Today, Soon) */}
   <Card>
     <h2>Tasks</h2>
     {/* ListRow per task: title, subtitle=subject, trailing=<Chip> with urgency label; row onClick=openTaskEditor(task) */}
   </Card>
   {/* Daily ritual entry (keep existing showDailyRitual state/modal) */}
   ```
   Layout: single column, `max-w-3xl mx-auto space-y-4`. No other sections. No framer-motion on these cards.
**Acceptance:** Today tab shows only: header, spotlight, agent bar, Today briefing, Habits card, Tasks card. Light & dark both consistent (no white cards in dark). `Overview.jsx` ≤ 1,800 lines. Build + lint pass.

---

### WO-03 — Reconnect stranded features (needs §2 decision)
**Option A (KEEP Learning):** in `src/App.jsx` add `{ id: 'learning', label: 'Learning', icon: GraduationCap, controls: 'app-active-workspace' }` after `habits` in the tabs array; remove `learning: 'projects'` from the redirect map. Learning renders as before (restyle is WO-13).
**Option B (ARCHIVE):** delete `LearningTracker.jsx`, `LearningPathDetailView.jsx`, `LearningPathCard.jsx`, `LearningPathModal.jsx`, `TopicModal.jsx`, `TopicCard.jsx`, `AITopicGenerator.jsx`, `TeachAgentModal.jsx`, `src/context/LearningContext.jsx`, `src/services/youtubeService.js`; remove `LearningProvider` from `src/context/AppProviders.jsx`; remove `useLearning` import + `learningWidgetItems`/`openLearningPath`/`openLearningHome`/pinned-path code from `Overview.jsx`; remove learning references from `src/services/agentPrompts.js`/`agentTools.js` (grep `learning`).

**Ideas (no decision needed):** keep `IdeasBoard` reachable inside Projects. In `ProjectBoards.jsx`, add a `SegmentedControl` at the top with `Projects | Ideas`; when `Ideas` selected, render `<IdeasBoard />` (lazy import). Remove `ideas: 'projects'` redirect only if a dedicated route is added instead.
**Acceptance:** every feature is either reachable in ≤2 clicks or deleted from disk — nothing stranded. Build + lint pass.

---

### WO-04 — Tasks tab: copy + tone cleanup
**File:** `src/components/Garden.jsx` (+ `TaskInput.jsx` if strings live there)
1. Replace copy (exact strings): "Today's task lane" → **"Tasks"**; "active tasks moving" → **"active"**; "Task flow" → **"All tasks"**; "Pick a task, shape the next steps, keep it moving." → *delete the sentence*; "No active tasks here." → **"No tasks."**; "No tasks scheduled for today." → **"Nothing scheduled today."**
2. The three colored stat tiles (Today / Chunked / Late with amber/blue/red backgrounds): restyle as plain text stats — `bg` = `var(--color-card)`, border `1px solid var(--color-rule)`, number in `var(--color-ink)`, label in `var(--color-muted)`. Late count may keep `var(--color-error)` for the number only.
3. Remove any remaining garden/seed/plant strings or icons (grep `-i "garden\|seed\|plant\|harvest"` in the file); replace with neutral equivalents ("Tasks", checkmark icons).
**Acceptance:** no metaphor copy on the tab; tiles monochrome; build + lint pass.

---

### WO-05 — Habits tab: remove sticker-desk leftovers
**Files:** `src/components/HabitTracker.jsx`, `TodayHabits.jsx`, `HabitCard.jsx`, `WeeklyGrid.jsx`
1. Grep these files for and remove: `rotate-[`, `rotate-`, decorative absolutely-positioned blobs (`pointer-events-none absolute` divs with `bg-*-300`), dot-grid backgrounds (`background-image:radial-gradient`), `border-2 border-slate-800`-style ink borders, `popShadow`/`inkBorder` class constants.
2. The "0/0 done" progress pill: restyle to `ui-card` with a thin progress bar (`height:4px; background:var(--color-rule)`, fill `var(--color-accent)`).
3. Empty state: replace the dashed border box with a plain `Card` — sprout emoji removed, text **"No habits yet."** + accent "Add Habit" button (keep existing handler).
4. Ensure the Add Habit button isn't clipped at the viewport bottom (it currently is): the container needs bottom padding `pb-24` → keep, but the button must be inside the card, not floating.
**Acceptance:** no rotation transforms, no dashed borders, no ink-black borders anywhere on the tab; visual language identical to Projects. Build + lint pass.

---

### WO-06 — Delete dead files
Delete these files (verified unreferenced, or their only consumers are also in this list — after WO-02 removed the `Penguin` import):
```
src/components/DailyLog.jsx          src/components/Plant.jsx
src/components/TaskCalendar.jsx      src/components/Analytics.jsx
src/components/PersonaAvatar.jsx     src/components/KanbanColumn.jsx
src/components/Penguin.jsx           src/components/VisionBoard.jsx
src/components/GoalCard.jsx          src/components/GoalModal.jsx
src/components/SleepTrendsDashboard.jsx
test_yt.js  test_yt.mjs  yt_out.txt  DemonToDoList.zip
```
Then in `src/App.jsx`: remove the `VisionBoard` and `SleepTrendsDashboard` lazy imports and their `activeTab === 'vision'` / `'sleep'` render blocks; keep the redirect map entries (`vision:'today'`, `sleep:'habits'`) so stale localStorage tab ids don't break. If `TopicCard.jsx` was not deleted in WO-03B, delete it here (unused either way).
**Pre-check for each file:** `grep -rn "/<Name>'" src` must return only self-references. **Acceptance:** build + lint pass; every tab loads.

---

### WO-07 — Replace all `alert()` with toasts
`ToastProvider` exists but is unused. Steps:
1. Wrap the app: in `src/main.jsx` or `AppProviders.jsx`, add `<ToastProvider>` around the tree (inside other providers).
2. For non-component call sites (contexts), add an imperative bridge in `src/ui/Toast.jsx`: export `toast(message, { tone: 'error' | 'success' | 'info' })` that posts into the provider via a module-level emitter (the provider registers a listener on mount).
3. Replace every `alert(...)` call — current inventory (28 sites): `ProjectContext.jsx` ×3, `TaskContext.jsx` ×1, `Garden.jsx` ×1, `TaskModal.jsx` ×1, `Calendar.jsx` ×4, `HabitModal.jsx` ×1, `Schedule.jsx` ×4, `WeeklyPlan.jsx` ×1, `ScheduleEventModal.jsx` ×2, `MagicBox.jsx` ×5, `Overview.jsx` ×1, `DailyLog.jsx` ×2 & `Plant.jsx` ×1 (skip — deleted in WO-06). Error messages → `tone:'error'`; success confirmations ("Successfully added…", "Task added…") → `tone:'success'`. Strip emoji/multi-line text down to one sentence.
4. Add ESLint rule `"no-alert": "error"` in `eslint.config.js`.
**Acceptance:** `grep -rn "alert(" src` returns 0 (excluding `ui/`); toasts appear top-right, auto-dismiss ~4s; build + lint pass.

---

### WO-08 — Focus: real timer inside Tasks; delete the points economy
1. **New file** `src/components/FocusTimer.jsx` (≤200 lines): props `{ task, onComplete }`. Countdown UI (25 min default; 15/25/45 presets via `SegmentedControl`), Start/Pause/Reset, `document.title` shows remaining time while running, on finish call `onComplete(minutes)` and `toast('Focus session logged', {tone:'success'})`. Plain `Card` styling; digits use `font-variant-numeric: tabular-nums`.
2. In `Garden.jsx`, each task row gets a timer icon button → opens `FocusTimer` in a `Sheet`. `onComplete` appends `{minutes, endedAt}` to the task's existing time-tracking field if present, else logs via existing `updateTask`.
3. Delete: `src/components/Focus.jsx`, `src/context/FocusContext.jsx`; remove `FocusProvider` from `AppProviders.jsx`; remove focus render block/lazy import in `App.jsx` (keep `focus:'tasks'` redirect).
4. New migration `supabase/migrations/2026-07-10_drop_focus_tables.sql`: `DROP TABLE IF EXISTS focus_point_transactions, focus_rewards, focus_inventory, focus_actions, focus_sessions;` — **file only, do not run it**; the owner runs it in Supabase.
**Acceptance:** timer opens from a task, counts down, logs on finish; `grep -rn "FocusContext" src` = 0; build + lint pass.

---

### WO-09 — Logging hygiene
1. New `src/utils/log.js`: `export const log = (...a) => { if (import.meta.env.DEV) console.log(...a); };`
2. Replace every `console.log` in `src/` with `log` (or delete where trivially noisy — e.g. the Smart Notification start/stop pair that currently spams on every render cycle). Keep `console.error`/`console.warn`.
3. Fix the underlying thrash: in `src/App.jsx`, `SmartNotificationBridge`'s effect depends on `[habits, scheduleItems, tasks]`, restarting the service on every data change. Change it to start once on mount (`[]` deps) — the service already receives a getter callback for fresh data.
**Acceptance:** console is silent during 2 minutes of idle app; build + lint pass.

---

### WO-10 — SQL consolidation
Move the 13 loose root `.sql` files into `supabase/migrations/` prefixed `000N_` in git-history order (`git log --format=%ai -- <file> | tail -1` to date them); create `supabase/schema.md` — one table per row: name / purpose / used by which context. No SQL content edits.
**Acceptance:** repo root has zero `.sql` files; `supabase/migrations/` is the single schema location.

---

### WO-11 — Event category picker (unblocks the Today briefing chips)
**File:** `src/components/ScheduleEventModal.jsx`
1. Add `const CATEGORY_OPTIONS = ['Work', 'Study', 'Personal', 'Health', 'Errands', 'Social', 'Other'];` at module scope.
2. Insert after the Duration block, before the Color Picker — same label/button styling as the Duration chips:
   ```jsx
   <div>
     <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
       <Tag size={14} className="inline mr-1" /> Category
     </label>
     <div className="flex gap-2 flex-wrap">
       {CATEGORY_OPTIONS.map((cat) => (
         <button key={cat} type="button"
           onClick={() => setFormData({ ...formData, category: cat })}
           className={/* copy the duration-chip classes; active when formData.category === cat */}>
           {cat}
         </button>
       ))}
     </div>
   </div>
   ```
   (`formData.category` already exists and already persists — this is UI only. Import `Tag` from lucide-react.)
3. Same picker in the Quick Schedule popup in `Overview.jsx` (currently hardcodes `category:'Other'`): a `<select>` with the same options is acceptable there.
**Acceptance:** create an event with category "Work" → Today briefing shows a "Work" chip; reopening the event shows "Work" selected. Build + lint pass.

---

### WO-12 — Plan tab: flatten Calendar → Schedule
`App.jsx` renders `Calendar.jsx` (282 lines: header + camera-scan + voice) which wraps `Schedule.jsx` (714 lines: actual week/day grid).
1. Move the scan/voice handlers and header controls from `Calendar.jsx` into `Schedule.jsx` (top toolbar, restyled with `SegmentedControl` for Day/Week).
2. Point the `schedule` render block in `App.jsx` at `Schedule` directly; delete `Calendar.jsx`.
3. Restyle `Schedule.jsx` surfaces with tokens (`ui-card` containers, `var(--color-rule)` grid lines, accent = current-time indicator). Do not change scheduling logic or `scheduleOccurrences` usage.
**Acceptance:** Plan tab functionally identical (add/edit/delete/scan/voice all work); one component layer; build + lint pass.

---

### WO-13 — Remaining restyles (repeat per file, same recipe)
Recipe per file: replace hand-rolled containers with `Card`/`ListRow`/`Chip`/`Sheet`; kill non-token colors (`grep -n "bg-\(indigo\|teal\|rose\|amber\|emerald\|sky\)-" <file>`); one accent only; remove decorative framer-motion (keep functional transitions ≤250ms).
Order: 1) `TaskModal.jsx` + `ScheduleEventModal.jsx` + `HabitModal.jsx` → present via `Sheet`; 2) `ChatSidebar.jsx`; 3) `DailyRitualModal.jsx`; 4) `MagicBox.jsx` (visual only); 5) Learning components if WO-03A.
**Acceptance per file:** zero non-token color classes; build + lint pass; feature still works.

---

### WO-14 — Split Overview.jsx into modules
After WO-02 the file should be ≤1,800 lines. Extract into `src/components/today/`: `QuickSchedulePopup.jsx`, `QuickAddTaskPopup.jsx`, `ScheduleBriefing.jsx` (the briefing card), `TodayTimeline.jsx` (the schedule list), `useAgentCommands.js` (the agent-routing handlers + confirmation-modal state). `Overview.jsx` becomes composition only.
**Acceptance:** `Overview.jsx` ≤ 400 lines; no file in `today/` > 300 lines; no behavior change; build + lint pass.

---

### WO-15 — Persona & gamification remnants
1. `src/context/GameContext.jsx`: remove persona state (`personaMessage`, `triggerPersonaReaction`, `displayMode`) and coin logic (`coins`, `earnCoins`, `buyPlot`, `unlockedPlots`, localStorage keys `growth-coins`/`growth-plots`, and the `profiles.coins/unlocked_plots` sync). Update consumers: `App.jsx` header coin counter — delete; `Garden.jsx` earn-coins calls — delete; grep `useGame(` for the rest. If the context becomes empty, delete it and its provider.
2. `src/services/gemini.js` + `agentPrompts.js`: remove demon/penguin persona prompt branches (grep `-i "demon\|penguin\|persona"`).
**Acceptance:** grep `-ri "demon\|penguin\|coins"` in `src/` returns 0 relevant hits; build + lint pass.

---

### WO-16 — (Last) Data layer: repository pattern
For each entity (tasks, schedule, habits, projects, ideas, goals): create `src/data/<entity>Repo.js` exposing `list/create/update/remove`, with two implementations chosen once at login state change (localStorage impl, Supabase impl). Contexts call repos and keep only React state. Do **one entity per commit**, starting with `schedule` (smallest surface: `TaskContext` schedule items). This WO is intentionally outline-level — propose the interface in a `SPEC-QUESTION:` PR comment before mass-applying.

---

## 4. Definition of done (whole project)

- 5 tabs (6 if Learning kept), all reachable, all in one visual language, light+dark.
- `grep -rn "alert(" src` → 0 · `grep -rn "console.log" src` → 0 · no file > 500 lines except `Schedule.jsx` (≤800 ok).
- Repo root: no `.sql`, no `.zip`, no test scraps.
- Every tab: create → edit → delete round-trip works in guest mode and (if configured) logged-in mode.
